import { DockError as Error, DockConsole as Console, bold } from './dock-events'
import type { LineTransformStream } from './dock-logs'
import type { Writable } from 'node:stream'

export abstract class Engine {

  log:
    Console

  abstract image (name: string|null, dockerfile?: string|null, extraFiles?: string[]):
    Image

  abstract container (id: string):
    Promise<Container>

  static Image:
    typeof Image

  static Container:
    typeof Container

  static LineTransformStream:
    typeof LineTransformStream

}

export abstract class Image {

  log:
    Console

  readonly name:
    string

  abstract ensure ():
    Promise<string|null>

  /** Throws if inspected image does not exist locally. */
  abstract check ():
    Promise<void>

  abstract pull ():
    Promise<void>

  abstract build ():
    Promise<void>

  abstract run (
    name?:         string,
    options?:      Partial<ContainerOpts>,
    command?:      ContainerCommand,
    entrypoint?:   ContainerCommand,
    outputStream?: Writable
  ): Promise<Container>

  abstract container (
    name?:       string,
    options?:    Partial<ContainerOpts>,
    command?:    ContainerCommand,
    entrypoint?: ContainerCommand,
  ): Container

  get [Symbol.toStringTag](): string { return this.name }

}

/** Interface to a Docker container. */
export abstract class Container {

  log:
    Console

  constructor (
    readonly image:       Image,
    readonly name?:       string,
    readonly options:     Partial<ContainerOpts> = {},
    readonly command?:    ContainerCommand,
    readonly entrypoint?: ContainerCommand
  ) {
    this.log = new Console(name ? `@hackbg/dock: ${name}` : `@hackbg/dock: container`)
  }

  abstract get id ():
    string

  abstract get shortId ():
    string

  abstract get warnings ():
    string[]

  abstract get isRunning ():
    Promise<boolean>

  abstract get ip ():
    Promise<string>

  abstract create ():
    Promise<this>

  abstract start ():
    Promise<this>

  abstract inspect ()

  abstract kill ():
    Promise<this>

  abstract wait ():
    Promise<void>

  abstract waitLog (
    expected:     string,
    thenDetach?:  boolean,
    waitSeconds?: number,
    logFilter?:   (data: string) => boolean
  ): Promise<void>

  abstract exec (...command: string[]):
    Promise<[string, string]>

  static async create (
    image:       Image,
    name?:       string,
    options?:    Partial<ContainerOpts>,
    command?:    ContainerCommand,
    entrypoint?: ContainerCommand,
  ) {
    await image.ensure()
    const self = new (this as any)(image, name, options, command, entrypoint)
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
      if (!self.container) throw new Error.NoContainer()
      const stream = await self.container.attach({ stream: true, stdin: true, stdout: true })
      stream.setEncoding('utf8')
      stream.pipe(outputStream, { end: true })
    }
    await self.start()
    return self
  }

  get [Symbol.toStringTag](): string { return this.name }

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
