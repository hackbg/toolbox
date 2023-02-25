import { Console, bold } from '@hackbg/logs'
import Docker from 'dockerode'
import { basename, dirname } from 'path'
import { Readable, Writable, Transform } from 'stream'

export * as Mock from './dock-mock'
import { mockDockerode } from './dock-mock'

const log = new Console('@hackbg/dock')

export { Docker }

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

/** Wrapper around Dockerode.
  * Used to optain `Image` instances. */
export class Engine {

  static mock (callback?: Function) {
    return new this(mockDockerode(callback))
  }

  /** By default, creates an instance of Dockerode
    * connected to env `DOCKER_HOST`. You can also pass
    * your own Dockerode instance or socket path. */
  constructor (dockerode?: DockerHandle|string) {
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

  log: Console

  readonly dockerode: DockerHandle

  image (
    name:        string|null,
    dockerfile?: string|null,
    extraFiles?: string[]
  ): Image {
    return new Image(this, name, dockerfile, extraFiles)
  }

  async container (id: string): Promise<Container> {
    const container = await this.dockerode.getContainer(id)
    const info = await container.inspect()
    const image = new Image(this, info.Image)
    return Object.assign(new Container(
      image,
      info.Name,
      undefined,
      info.Args,
      info.Path
    ), { container })
  }

  static Image: typeof Image

  static Container: typeof Container

  static LineTransformStream: typeof LineTransformStream

}

/** Interface to a Docker image. */
export class Image {

  constructor (
    readonly dock:       Engine|null,
    readonly name:       string|null,
    readonly dockerfile: string|null = null,
    readonly extraFiles: string[]    = []
  ) {
    if (dock && !(dock instanceof Engine)) {
      throw new Error('Image: pass a Dock.Engine instance')
    }
    if (!name && !dockerfile) {
      throw new Error('Image: specify at least one of: name, dockerfile')
    }
    this.log = new Console(`@hackbg/dock: ${this.name}`)
  }

  get [Symbol.toStringTag]() {
    return this.name
  }

  log: Console

  get dockerode (): Docker {
    if (!this.dock || !this.dock.dockerode) throw new Error('Docker API client not set')
    return this.dock.dockerode as unknown as Docker
  }

  _available: Promise<string|null>|null = null

  async ensure () {

    this._available ??= new Promise(async(resolve, reject)=>{
      this.log.info('Ensuring that the image exists')
      const PULLING  = `Not cached, pulling`
      const BUILDING = `Not found in registry, building`
      const NO_FILE  = `Unavailable and no Dockerfile provided; can't proceed.`
      try {
        await this.check()
        this.log.info('Image exists')
      } catch (_e) {
        this.log.error(_e)
        try {
          this.log.warn(`${PULLING} ${_e.message}`)
          await this.pull()
        } catch (e) {
          if (!this.dockerfile) {
            reject(`${NO_FILE} (${e.message})`)
          } else {
            this.log.warn(`${BUILDING} ${_e.message}`)
            this.log.info(bold('Using dockerfile:'), this.dockerfile)
            await this.build()
          }
        }
      }
      return resolve(this.name)
    })

    return await this._available

  }

  /** Throws if inspected image does not exist locally. */
  async check () {
    if (!this.name) throw new Error(`Can't inspect image with no name.`)
    await this.dockerode.getImage(this.name).inspect()
  }

  /** Throws if inspected image does not exist in Docker Hub. */
  async pull () {
    const { name, dockerode } = this
    if (!name) throw new Error(`Can't pull image with no name.`)
    await new Promise<void>((ok, fail)=>{
      const log = new Console(`@hackbg/dock: ${this.name} (pull)`)
      dockerode.pull(name, async (err: any, stream: any) => {
        if (err) return fail(err)
        await follow(dockerode, stream, (event) => {
          if (event.error) {
            log.error(event.error)
            throw new Error(`Pulling ${name} failed.`)
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
    if (!this.dockerfile) throw Errors.NoDockerfile()
    if (!this.dock?.dockerode) throw Errors.NoDockerode()
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
        throw new Error(`Building ${name} from ${dockerfile} in ${context} failed.`)
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
    return await Container.run(
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
    return new Container(this, name, options, command, entrypoint)
  }

}

export interface ContainerOpts {
  cwd:      string
  env:      Record<string, string>
  exposed:  string[]
  mapped:   Record<string, string>
  readonly: Record<string, string>
  writable: Record<string, string>
  extra:    Record<string, unknown>
  remove:   boolean
}

export type ContainerCommand = string|string[]

/** Interface to a Docker container. */
export class Container {

  static async create (
    image:       Image,
    name?:       string,
    options?:    Partial<ContainerOpts>,
    command?:    ContainerCommand,
    entrypoint?: ContainerCommand,
  ) {
    await image.ensure()
    const self = new this(image, name, options, command, entrypoint)
    await self.create()
    return self
  }

  static async run (
    image:         Image,
    name?:         string,
    options?:      Partial<ContainerOpts>,
    command?:      ContainerCommand,
    entrypoint?:   ContainerCommand,
    outputStream?: Writable
  ) {
    const self = await this.create(image, name, options, command, entrypoint)
    if (outputStream) {
      if (!self.container) throw Errors.NoContainer()
      const stream = await self.container.attach({ stream: true, stdin: true, stdout: true })
      stream.setEncoding('utf8')
      stream.pipe(outputStream, { end: true })
    }
    await self.start()
    return self
  }

  constructor (
    readonly image:       Image,
    readonly name?:       string,
    readonly options:     Partial<ContainerOpts> = {},
    readonly command?:    ContainerCommand,
    readonly entrypoint?: ContainerCommand
  ) {
    this.log = new Console(name ? `@hackbg/dock: ${name}` : `@hackbg/dock: container`)
  }

  get [Symbol.toStringTag]() {
    return this.name
  }

  container: Docker.Container|null = null

  log: Console

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
    const config: any = {
      Image:        this.image.name,
      Name:         this.name,
      Entrypoint:   this.entrypoint,
      Cmd:          this.command,
      Env:          Object.entries(env).map(([key, val])=>`${key}=${val}`),
      WorkingDir:   cwd,
      ExposedPorts: {},
      HostConfig:   { Binds: [], PortBindings: {}, AutoRemove: remove }
    }
    for (const containerPort of exposed) {
      config.ExposedPorts[containerPort] = { /*docker api needs empty object here*/ }
    }
    for (const [containerPort, hostPort] of Object.entries(mapped)) {
      config.HostConfig.PortBindings[containerPort] = {HostPort: hostPort}
    }
    for (const [hostPath, containerPath] of Object.entries(readonly)) {
      config.HostConfig.Binds.push(`${hostPath}:${containerPath}:ro`)
    }
    for (const [hostPath, containerPath] of Object.entries(writable)) {
      config.HostConfig.Binds.push(`${hostPath}:${containerPath}:rw`)
    }
    return {
      ...config,
      ...JSON.parse(JSON.stringify(extra)), // "smart" clone; `extra` overrides all
    }
  }

  get id (): string {
    if (!this.container) throw Errors.NoContainer()
    return this.container.id
  }

  get shortId (): string {
    if (!this.container) throw Errors.NoContainer()
    return this.container.id.slice(0, 8)
  }

  async create (): Promise<this> {
    if (this.container) throw Errors.ContainerAlreadyCreated()
    this.image.log.info('Creating container')
    const opts = this.dockerodeOpts
    this.container = await this.dockerode.createContainer(opts)
    this.log.label = this.name
      ? `@hackbg/dock: ${this.name} (${this.container.id})`
      : `@hackbg/dock: ${this.container.id}`
    for (const bind of opts?.HostConfig?.Binds ?? []) {
      this.log.info('Bind:', bind)
    }
    for (const [containerPort, config] of Object.entries(opts?.HostConfig?.PortBindings ?? {})) {
      const hostPort = (config as any)?.HostPort??'(unknown)'
      this.log.info(`Container port ${containerPort} bound to host port ${hostPort}`)
    }
    if (this.warnings) {
      log.warn(`Creating container ${this.shortId} emitted warnings:`)
      log.info(this.warnings)
    }
    return this
  }

  get warnings (): string[] {
    if (!this.container) throw Errors.NoContainer()
    return (this.container as any).Warnings
  }

  async start (): Promise<this> {
    if (!this.container) await this.create()
    await this.container!.start()
    return this
  }

  inspect () {
    if (!this.container) throw Errors.NoContainer()
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
    if (!this.container) throw Errors.NoContainer()
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
    if (!this.container) throw Errors.NoContainer()
    return await this.container.wait()
  }

  async waitLog (
    expected:     string,
    thenDetach?:  boolean,
    waitSeconds?: number,
    logFilter?:   (data: string) => boolean
  ) {
    if (!this.container) throw Errors.NoContainer()
    return waitUntilLogsSay(this.container, expected, thenDetach, waitSeconds, logFilter)
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

/** The caveman solution to detecting when the node is ready to start receiving requests:
  * trail node logs until a certain string is encountered */
export function waitUntilLogsSay (
  container: Docker.Container,
  expected:  string,
  thenDetach  = true,
  waitSeconds = 7,
  logFilter   = (data: string) => true
) {
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

/** Based on: Line Transform Stream by Nick Schwarzenberg <nick@bitfasching.de>
  * https://github.com/bitfasching/node-line-transform-stream#readme
  * Used under MIT license. */
export class LineTransformStream extends Transform {
  declare transformCallback: Function
  declare stringEncoding:    string
  declare lineBuffer:        string
  constructor (transformCallback: Function, stringEncoding: string = 'utf8') {
    // fail if callback is not a function
    if (typeof transformCallback != 'function') throw new TypeError("Callback must be a function.")
    // initialize parent
    super()
    // set callback for transforming lines
    this.transformCallback = transformCallback
    // set string encoding
    this.stringEncoding = stringEncoding
    // initialize internal line buffer
    this.lineBuffer = ''
  }
  // implement transform method (input encoding is ignored)
  _transform(data: any, encoding: string, callback: Function) {
    // convert data to string
    data = data.toString(this.stringEncoding)
    // split data at line breaks
    const lines = data.split( '\n' )
    // prepend buffered data to first line
    lines[0] = this.lineBuffer + lines[0]
    // last "line" is actually not a complete line,
    // remove it and store it for next time
    this.lineBuffer = lines.pop()
    // collect output
    let output = ''
    // process line by line
    lines.forEach((line: string) => {
      try {
        // pass line to callback, transform it and add line-break back
        output += this.transformCallback( line ) + '\n'
      } catch (error) {
        // catch processing errors and emit as stream error
        callback(error)
      }
    })
    // push output
    callback(null, output)
  }
}

export const Errors = {
  NoDockerode:             () => new Error('No Dockerode handle'),
  NoDockerfile:            () => new Error('No dockerfile specified'),
  NoContainer:             () => new Error('No container'),
  ContainerAlreadyCreated: () => new Error('Container already created')
}
