import { Engine, Image, Container } from './dock-base'
import type { ContainerOpts, ContainerCommand } from './dock-base'
import { DockError as Error, DockConsole as Console, bold } from './dock-events'

import { Readable, Writable, Transform } from 'node:stream'

const log = new Console('@hackbg/dock: podman')

class PodmanEngine extends Engine {

  constructor (...podmanCommand: string[]) {
    super()
    this.podmanCommand = (podmanCommand.length > 0) ? podmanCommand : ['/usr/bin/env', 'podman']
  }

  podmanCommand: string[]

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

  constructor (
    readonly dock:       PodmanEngine|null,
    readonly name:       string|null,
    readonly dockerfile: string|null = null,
    readonly extraFiles: string[]    = []
  ) {
    super()
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

  async ensure () { return '' }

  async check () {}

  async pull () {}

  async build () {}

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

  get id () { return '' }

  get warnings () { return [] }

  get shortId () { return '' }

  get isRunning () { return Promise.resolve(false) }

  get ip () { return Promise.resolve('') }

  async create () { return this }

  async start () { return this }

  async wait () {}

  async waitLog () {}

  async kill () { return this }

  async inspect () {}

  async exec (...command: string[]): Promise<[string, string]> { return ['', ''] }

}

export {
  PodmanEngine    as Engine,
  PodmanImage     as Image,
  PodmanContainer as Container,
}
