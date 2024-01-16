import { Console, colors, randomColor } from '@hackbg/logs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sep, resolve, dirname, relative, basename } from 'node:path'
import { cwd } from 'node:process'

export interface PathCtor <T> {
  new (...fragments: string[]): T
}

export type ToPath = string|URL|Path

export class Path {

  static separator = sep

  constructor (base: ToPath = cwd(), ...fragments: string[]) {

    if (base instanceof URL || (typeof base === 'string' && base.startsWith('file://'))) {
      base = fileURLToPath(base)
    } else if (typeof base === 'object') {
      base = base.absolute
    }

    this.absolute = resolve(base, ...fragments)

    this.log = Object.assign(new Console(`${this.short}`), {
      label: colors.bgHex(randomColor({
        luminosity: 'dark', seed: this.absolute
      })).whiteBright(`${this.short}`)
    })

    for (const property of ['log', 'path']) {
      Object.defineProperty(this, property, {
        configurable: true,
        writable:     true,
        enumerable:   false,
      })
    }

  }

  get [Symbol.toStringTag] () {
    return this.short
  }

  log: Console

  /** The resolved absolute filesystem path represented by this object. */
  absolute: string

  /** @returns this.absolute represented as a file:/// URL */
  get url (): URL {
    return pathToFileURL(this.absolute)
  }

  /** @returns name of this file or directory. */
  get name (): string {
    return basename(this.absolute)
  }

  /** @returns absolute path to parent directory. */
  get dirname (): string {
    return dirname(this.absolute)
  }

  /** @returns name of this file or directory. */
  basename (ext?: string): string {
    return basename(this.absolute, ext)
  }

  get short (): string {
    const relative = this.relativeFrom()
    if (relative.length < this.absolute.length) {
      return relative
    } else {
      return this.absolute
    }
  }

  relativeFrom (base: string = cwd()): string {
    return relative(base, this.absolute) || '.'
  }

  relativeTo (target: string = cwd()): string {
    return relative(this.absolute, target) || '.'
  }

  resolve (...fragments: string[]): string {
    return resolve(this.absolute, ...fragments)
  }

  make (): this {
    throw new Error("file or directory? use subclass")
  }

  entrypoint <T> (command: (argv:string[])=>T): T|undefined {
    if (this.absolute === process.argv[1]) {
      return command(process.argv.slice(2))
    }
  }

}
