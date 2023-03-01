import { Engine, Image, Container } from './dock-base'
import type { ContainerOpts, ContainerCommand } from './dock-base'
import { DockError as Error, DockConsole as Console, bold } from './dock-events'

import { Readable, Writable, Transform } from 'node:stream'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'

import $, { JSONFile } from '@hackbg/file'

const log = new Console('@hackbg/dock: podman')

class PodmanEngine extends Engine {

  constructor (...podmanCommand: string[]) {
    super('podman')
    this.podmanCommand = (podmanCommand.length > 0) ? podmanCommand : ['/usr/bin/env', 'podman']
  }

  podmanCommand: string[]

  podman (...command: string[]): Promise<void> {
    command = [...this.podmanCommand, ...command]
    return new Promise((resolve, reject)=>{
      const run = spawn(command[0], command.slice(1))
      run.stdout.on("data", (x) => process.stdout.write(x.toString()))
      run.stderr.on("data", (x) => process.stderr.write(x.toString()))
      run.on("exit", (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(Object.assign(
            new Error(`Process ${run.pid} (${command.join(' ')}) exited with code ${code}`),
            { code, pid: run.pid, command }
          ))
        }
      })
    })
  }

  ensurePolicy (transport: string, scope: string, policies: any[]) {
    const policyPath = $(homedir(), '.config', 'containers', 'policy.json')
    const policyFile = policyPath.as(JSONFile).touch()
    let policy
    try {
      policy = policyFile.load()
    } catch (e) {
      if (e.message === 'Unexpected end of JSON input') {
        policy = {}
      } else {
        throw e
      }
    }
    policy.default ??= [{"type": "reject"}]
    policy.transports ??= {}
    policy.transports[transport] ??= {}
    policy.transports[transport][scope] ??= policies
    this.log.info(`Updating container policy at`, policyPath.path)
    policyFile.save(policy)
  }

  image (
    name:        string|null,
    dockerfile?: string|null,
    extraFiles?: string[]
  ): PodmanImage {
    return new PodmanImage(this, name, dockerfile, extraFiles)
  }

  async container (id: string): Promise<PodmanContainer> {
    const image = this.image(null /* FIXME */)
    return new PodmanContainer(image)
  }

}

class PodmanImage extends Image {

  declare engine:
    PodmanEngine

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

  async check () {
    if (!this.name) throw new Error.NoName('inspect')
  }

  async pull () {
    const { name } = this
    if (!name) throw new Error.NoName('pull')
    return this.engine.podman('pull', name)
  }

  async build () {
    if (!this.dockerfile) throw new Error.NoDockerfile()
    return this.engine.podman('build')
  }

  container (
    name?:       string,
    options?:    Partial<ContainerOpts>,
    command?:    ContainerCommand,
    entrypoint?: ContainerCommand,
  ) {
    return new PodmanContainer(
      this,
      name,
      options,
      command,
      entrypoint
    )
  }

}

class PodmanContainer extends Container {

  declare image:
    PodmanImage

  get id () { return '' }

  get warnings () { return [] }

  get shortId () { return '' }

  get isRunning () { return Promise.resolve(false) }

  get ip () { return Promise.resolve('') }

  async create () { return this }

  async start () {
    await this.image.engine.podman('start', this.id)
    return this
  }

  async wait () {
    await this.image.engine.podman('wait', this.id)
  }

  async waitLog () {
  }

  async kill () {
    await this.image.engine.podman('kill', this.id)
    return this
  }

  async inspect () {
    await this.image.engine.podman('inspect', this.id)
  }

  async exec (...command: string[]): Promise<[string, string]> {
    return ['', '']
  }

}

export {
  PodmanEngine    as Engine,
  PodmanImage     as Image,
  PodmanContainer as Container,
}
