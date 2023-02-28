import { Engine, Image, Container } from './dock-base'
import type { ContainerOpts, ContainerCommand } from './dock-base'
import { DockError as Error, DockConsole as Console, bold } from './dock-events'

import { Readable, Writable, Transform } from 'node:stream'
import { basename, dirname } from 'node:path'

import Docker from 'dockerode'
export { Docker }

const log = new Console('@hackbg/dock: docker')

export interface DockerHandle {
  getImage:         Function
  buildImage:       Function
  getContainer:     Function
  pull:             Function
  createContainer:  Function
  run:              Function
  modem: {
    host?:          string
    socketPath?:    string
    followProgress: Function,
  },
}

/** Defaults to the `DOCKER_HOST` environment variable. */
export const socketPath = process.env.DOCKER_HOST || '/var/run/docker.sock'

class DockerEngine extends Engine {

  static mock (callback?: Function) {
    return new this(mockDockerode(callback))
  }

  readonly dockerode: DockerHandle

  /** By default, creates an instance of Dockerode
    * connected to env `DOCKER_HOST`. You can also pass
    * your own Dockerode instance or socket path. */
  constructor (dockerode?: DockerHandle|string) {
    super()
    if (!dockerode) {
      this.dockerode = new Docker({ socketPath })
    } else if (typeof dockerode === 'object') {
      this.dockerode = dockerode
    } else if (typeof dockerode === 'string') {
      this.dockerode = new Docker({ socketPath: dockerode })
    } else {
      throw new Error('@hackbg/dock: invalid init')
    }
    const api = this.dockerode.modem.host??this.dockerode.modem.socketPath
    this.log = new Console(`@hackbg/dock: ${api}`)
  }

  image (
    name:        string|null,
    dockerfile?: string|null,
    extraFiles?: string[]
  ): DockerImage {
    return new DockerImage(this, name, dockerfile, extraFiles)
  }

  async container (id: string): Promise<DockerContainer> {
    const container = await this.dockerode.getContainer(id)
    const info = await container.inspect()
    const image = this.image(info.Image)
    return Object.assign(new DockerContainer(
      image,
      info.Name,
      undefined,
      info.Args,
      info.Path
    ), { container })
  }
}

class DockerImage extends Image {

  constructor (
    readonly dock:       DockerEngine|null,
    readonly name:       string|null,
    readonly dockerfile: string|null = null,
    readonly extraFiles: string[]    = []
  ) {
    super()
    if (dock && !(dock instanceof DockerEngine)) throw new Error.NotDockerode()
    if (!name && !dockerfile) throw new Error.NoNameNorDockerfile()
    this.log = new Console(`@hackbg/dock: ${this.name}`)
  }

  get dockerode (): Docker {
    if (!this.dock || !this.dock.dockerode) throw new Error.NoDockerode()
    return this.dock.dockerode as unknown as Docker
  }

  protected _available:
    Promise<string|null>|null = null

  async ensure () {

    this._available ??= new Promise(async(resolve, reject)=>{

      this.log.ensuring()

      try {

        await this.check()
        this.log.imageExists()

      } catch (e1) {

        if (e1.statusCode === 404) {
          // if image doesn't exist locally, try pulling it
          try {

            this.log.notCachedPulling()
            await this.pull()

          } catch (e2) {

            this.log.error(e2)

            if (!this.dockerfile) {

              const NO_FILE  = `Unavailable and no Dockerfile provided; can't proceed.`
              reject(`${NO_FILE} (${e2.message})`)

            } else {

              this.log.notFoundBuilding(e2.message)
              this.log.buildingFromDockerfile(this.dockerfile)
              await this.build()

            }

          }
        } else {

          throw e1

        }

      }

      return resolve(this.name)

    })

    return await this._available

  }

  async check () {
    if (!this.name) throw new Error.NoName('inspect')
    await this.dockerode.getImage(this.name).inspect()
  }

  /** Throws if inspected image does not exist in Docker Hub. */
  async pull () {
    const { name, dockerode } = this
    if (!name) throw new Error.NoName('pull')
    await new Promise<void>((ok, fail)=>{
      const log = new Console(`@hackbg/dock: ${this.name} (pull)`)
      dockerode.pull(name, async (err: any, stream: any) => {
        if (err) return fail(err)
        await follow(dockerode, stream, (event) => {
          if (event.error) {
            log.error(event.error)
            throw new Error.PullFailed(name)
          }
          const data = ['id', 'status', 'progress'].map(x=>event[x]).join(' ')
          log.log(data)
        })
        ok()
      })
    })
  }

  /* Throws if the build fails, and then you have to fix stuff. */
  async build () {
    if (!this.dockerfile) throw new Error.NoDockerfile()
    if (!this.dock?.dockerode) throw new Error.NoDockerode()
    const { name, dock: { dockerode } } = this
    const dockerfile = basename(this.dockerfile)
    const context = dirname(this.dockerfile)
    const src = [dockerfile, ...this.extraFiles]
    const build = await dockerode.buildImage(
      { context, src },
      { t: this.name, dockerfile }
    )
    const log = new Console(`@hackbg/dock: ${this.name} (build)`)
    await follow(dockerode, build, (event) => {
      if (event.error) {
        log.error(event.error)
        throw new Error.BuildFailed(name, dockerfile, context)
      }
      const data = event.progress || event.status || event.stream || JSON.stringify(event) || ''
      log.log(data.trim())
    })
  }

  async run (
    name?:         string,
    options?:      Partial<ContainerOpts>,
    command?:      ContainerCommand,
    entrypoint?:   ContainerCommand,
    outputStream?: Writable
  ) {
    return await DockerContainer.run(
      this,
      name,
      options,
      command,
      entrypoint,
      outputStream
    )
  }

  container (
    name?:       string,
    options?:    Partial<ContainerOpts>,
    command?:    ContainerCommand,
    entrypoint?: ContainerCommand,
  ) {
    return new DockerContainer(
      this,
      name,
      options,
      command,
      entrypoint
    )
  }

}

/** Follow the output stream from a Dockerode container until it closes. */
export async function follow (dockerode: DockerHandle, stream: any, callback: (data: any)=>void) {
  await new Promise<void>((ok, fail)=>{
    dockerode.modem.followProgress(stream, complete, callback)
    function complete (err: any, _output: any) {
      if (err) return fail(err)
      ok()
    }
  })
}

class DockerContainer extends Container {

  container: Docker.Container|null = null

  declare image: DockerImage

  get dockerode (): Docker {
    return this.image.dockerode as unknown as Docker
  }

  get dockerodeOpts (): Docker.ContainerCreateOptions {

    const {
      remove   = false,
      env      = {},
      exposed  = [],
      mapped   = {},
      readonly = {},
      writable = {},
      extra    = {},
      cwd
    } = this.options

    const config = {
      Image: this.image.name,
      Name: this.name,
      Entrypoint: this.entrypoint,
      Cmd: this.command,
      Env: Object.entries(env).map(([key, val])=>`${key}=${val}`),
      WorkingDir: cwd,
      ExposedPorts: {},
      HostConfig: {
        Binds: [],
        PortBindings: [],
        AutoRemove: remove
      }
    }

    exposed
      .forEach(containerPort=>
        config.ExposedPorts[containerPort] = {})

    Object.entries(mapped)
      .forEach(([containerPort, hostPort])=>
        config.HostConfig.PortBindings[containerPort] = [{ HostPort: hostPort }])

    Object.entries(readonly)
      .forEach(([hostPath, containerPath])=>
        config.HostConfig.Binds.push(`${hostPath}:${containerPath}:ro`))

    Object.entries(writable)
      .forEach(([hostPath, containerPath])=>
        config.HostConfig.Binds.push(`${hostPath}:${containerPath}:rw`))

    return Object.assign(config, JSON.parse(JSON.stringify(extra)))

  }

  get id (): string {
    if (!this.container) throw new Error.NoContainer()
    return this.container.id
  }

  get shortId (): string {
    if (!this.container) throw new Error.NoContainer()
    return this.container.id.slice(0, 8)
  }

  async create (): Promise<this> {
    if (this.container) throw new Error.ContainerAlreadyCreated()

    this.image.log.creatingContainer()

    // Specify the container
    const opts = this.dockerodeOpts

    // Log mounted volumes
    for (const bind of opts?.HostConfig?.Binds ?? []) {
      this.log.info('Bind:', bind)
    }

    // Log exposed ports
    for (const [containerPort, config] of Object.entries(opts?.HostConfig?.PortBindings ?? {})) {
      for (const { HostPort = '(unknown)' } of config as Array<{HostPort: unknown}>) {
        this.log.boundPort(containerPort, HostPort)
      }
    }

    // Create the container
    this.container = await this.dockerode.createContainer(opts)

    // Update the logger tag with the container id
    this.log.label = this.name
      ? `@hackbg/dock: ${this.name} (${this.container.id})`
      : `@hackbg/dock: ${this.container.id}`

    // Display any warnings emitted during container creation
    if (this.warnings) {
      this.log.createdWithWarnings(this.shortId, this.warnings)
    }

    return this
  }

  get warnings (): string[] {
    if (!this.container) throw new Error.NoContainer()
    return (this.container as any).Warnings
  }

  async start (): Promise<this> {
    if (!this.container) await this.create()
    await this.container!.start()
    return this
  }

  inspect () {
    if (!this.container) throw new Error.NoContainer()
    return this.container.inspect()
  }

  get isRunning (): Promise<boolean> {
    return this.inspect()
      .then(({ State: { Running } })=>Running)
  }

  get ip (): Promise<string> {
    return this.inspect()
      .then(({ NetworkSettings: { IPAddress } })=>IPAddress)
  }

  async kill (): Promise<this> {
    if (!this.container) throw new Error.NoContainer()
    const id = this.shortId
    const prettyId = bold(id.slice(0,8))
    if (await this.isRunning) {
      log.info(`Stopping ${prettyId}...`)
      await this.dockerode.getContainer(id).kill()
      log.info(`Stopped ${prettyId}`)
    } else {
      log.warn(`Container already stopped: ${prettyId}`)
    }
    return this
  }

  async wait () {
    if (!this.container) throw new Error.NoContainer()
    return await this.container.wait()
  }

  async waitLog (
    expected:     string,
    thenDetach?:  boolean,
    waitSeconds?: number,
    logFilter?:   (data: string) => boolean
  ): Promise<void> {
    if (!this.container) throw new Error.NoContainer()
    return waitUntilLogsSay(
      this.container,
      expected,
      thenDetach,
      waitSeconds,
      logFilter
    )
  }

  /** Executes a command in the container.
    * @returns [stdout, stderr] */
  async exec (...command: string[]): Promise<[string, string]> {

    if (!this.container) throw new Error.NoContainer()

    // Specify the execution
    const exec = await this.container.exec({
      Cmd: command,
      AttachStdin:  true,
      AttachStdout: true,
      AttachStderr: true,
    })

    // Collect stdout
    let stdout = ''; const stdoutStream = new Transform({
      transform (chunk, encoding, callback) { stdout += chunk; callback() }
    })

    // Collect stderr
    let stderr = ''; const stderrStream = new Transform({
      transform (chunk, encoding, callback) { stderr += chunk; callback() }
    })

    return new Promise(async (resolve, reject)=>{

      // Start the executon
      const stream = await exec.start({hijack: true})

      // Bind this promise to the stream
      stream.on('error', error => reject(error))
      stream.on('end', () => resolve([stdout, stderr]))

      // Demux the stdout/stderr stream into the two output streams
      this.dockerode.modem.demuxStream(stream, stdoutStream, stderrStream)

    })

  }

}

/** (to the tune of "What does the fox say?") The caveman solution
  * to detecting when a service is ready to start receiving requests:
  * trail node logs until a certain string is encountered  */
export function waitUntilLogsSay (
  container: Docker.Container,
  expected:  string,
  thenDetach  = true,
  waitSeconds = 7,
  logFilter   = (data: string) => true
): Promise<void> {
  const id = container.id.slice(0,8)
  const log = new Console(`@hackbg/dock: ${id}`)
  log.info('Trailing logs, waiting for:', expected)
  return new Promise(async (ok, fail)=>{

    const stream = await container.logs({ stdout: true, stderr: true, follow: true, })
    if (!stream) return fail(new Error('no stream returned from container'))
    stream.on('error', error => fail(error))
    stream.on('data', function ondata (data) {

      const dataStr = String(data).trim()
      if (logFilter(dataStr)) {
        log.info(dataStr)
      }

      if (dataStr.indexOf(expected)>-1) {
        log.info(bold(`Found expected message:`), expected)
        stream.off('data', ondata)
        //@ts-ignore
        if (thenDetach) stream.destroy()
        if (waitSeconds > 0) {
          log.info(bold(`Waiting ${waitSeconds} seconds`), `for good measure...`)
          return setTimeout(ok, waitSeconds * 1000)
        }
      }

    })

  })
}

/** A stub implementation of the Dockerode APIs used by @hackbg/dock. */
export function mockDockerode (callback: Function = () => {}): DockerHandle {
  return {
    getImage () {
      return { async inspect () { return } }
    },
    getContainer (options: any) {
      return mockDockerodeContainer(callback)
    },
    async pull () {},
    buildImage () {},
    async createContainer (options: any) {
      return mockDockerodeContainer(callback)
    },
    async run (...args: any) {
      callback({run:args})
      return [{Error:null,StatusCode:0},Symbol()]
    },
    modem: {
      followProgress (stream: any, complete: Function, callback: any) { complete(null, null) }
    }
  }
}

export function mockDockerodeContainer (callback: Function = () => {}) {
  return {
    id: 'mockmockmock',
    logs (options: any, cb: Function) {
      cb(...(callback({ createContainer: options })||[null, mockStream()]))
    },
    async start   () {},
    async attach  () { return {setEncoding(){},pipe(){}} },
    async wait    () { return {Error:null,StatusCode:0}  },
    async inspect () { return {Image:' ',Name:null,Args:null,Path:null,State:{Running:null}}}
  }
}

export function mockStream () {
  return { on: () => {} }
}

export {
  DockerEngine    as Engine,
  DockerImage     as Image,
  DockerContainer as Container
}
