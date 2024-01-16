import rimrafCb from 'rimraf'
import { cwd } from 'process'
import { Console, bold, colors, randomColor } from '@hackbg/logs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve, dirname, basename, relative, sep } from 'node:path'
import { lstatSync, readlinkSync, symlinkSync } from 'node:fs'

export interface PathCtor <T> {
  new (...fragments: string[]): T
}

export class Path {

  constructor (base: string|URL|Path = cwd(), ...fragments: string[]) {
    if (base instanceof URL || (typeof base === 'string' && base.startsWith('file://'))) {
      base = fileURLToPath(base)
    } else if (typeof base === 'object') {
      base = base.path
    }
    this.path = resolve(base, ...fragments)
    this.log = Object.assign(new Console(`${this.shortPath}`), {
      label: colors.bgHex(randomColor({
        luminosity: 'dark', seed: this.path
      })).whiteBright(`${this.shortPath}`)
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
    return this.path
  }

  log: Console

  /** The filesystem path represented by this object. */
  path: string

  /** @returns this path represented as a file:/// URL */
  get url (): URL {
    return pathToFileURL(this.path)
  }

  resolve (path: string): string {
    if (this.isDirectory()) {
      return resolve(this.path, path)
    } else {
      return resolve(dirname(this.path), path)
    }
  }

  relative (path: Path|string): string {
    if (path instanceof Path) path = path.path
    if (this.isDirectory()) {
      return relative(this.path, path)
    } else {
      return relative(dirname(this.path), path)
    }
  }

  /** @returns name of this file or directory. */
  get basename (): string {
    return basename(this.path)
  }

  /** @returns absolute path to parent directory. */
  get dirname (): string {
    return dirname(this.path)
  }

  /** @returns absolute path to parent directory. */
  get parent (): Path {
    return $.directory(this.dirname)
  }

  /** Create the parent directory of this path. */
  makeParent (): this {
    this.parent.make()
    return this
  }

  get shortPath (): string {
    const relativePath = this.relativePath
    if (relativePath.length < this.path.length) {
      return relativePath
    } else {
      return this.path
    }
  }

  get relativePath (): string {
    return relative(cwd(), this.path) || '.'
  }

  /** @returns Path to directory relative to this. */
  at (...fragments: string[]): Path {
    const sub = new (this.constructor as typeof Path)(this.path, ...fragments)
    if (sub.isDirectory()) this.log.warn(`expected ${sub.shortPath} to be a directory`)
    return sub
  }

  /** @returns Path to file relative to this. */
  in (...fragments: string[]): Path {
    const sub = new (this.constructor as typeof Path)(this.path, ...fragments)
    if (sub.isFile()) this.log.warn(`expected ${sub.shortPath} to be a file`)
    return sub
  }

  /** @returns an instance of the passed class, pointing to this path,
    * and (hopefully) knowing what to do with the data at this path. */
  as <T, U extends BaseFile<T>|BaseDirectory<T, BaseFile<T>>> (Ctor: PathCtor<U>): U {
    return new Ctor(this.path)
  }

  exists () {
    try {
      return statSync(this.path)
    } catch (e) {
      if (e.code === 'ELOOP') {
        this.log.warn('circular symlink')
        return lstatSync(this.path)
      } else if (e.code === 'ENOENT') {
        return null
      } else {
        throw e
      }
    }
  }

  assert (): this {
    if (this.exists()) return this
    throw new Error(`${this.path} does not exist`)
  }

  make (): this {
    throw new Error("file or directory? use subclass")
  }

  /** @returns true if a directory exists at this.path */
  isDirectory (name?: string): boolean {
    const nameMatches = name ? (name === this.basename) : true
    return !!(this.exists()?.isDirectory() && nameMatches)
  }

  /** @returns true if a file exists at this.path */
  isFile (name?: string): boolean {
    const nameMatches = name ? (name === this.basename) : true
    return !!(this.exists()?.isFile() && nameMatches)
  }

  /** @returns true if this path is a symlink. */
  get isLink (): boolean {
    return !!(this.exists() && lstatSync(this.path).isSymbolicLink())
  }

  delete (): this {
    if (this.exists()) {
      this.log.log('Deleting')
      rimrafCb.sync(this.path)
    }
    return this
  }

  entrypoint <T> (command: (argv:string[])=>T): T|undefined {
    if (this.path === process.argv[1]) {
      return command(process.argv.slice(2))
    }
  }

  get real (): this {
    let self = this
    let visited = new Set<string>([])
    while (self.isLink) {
      if (visited.has(self.path)) {
        this.log.warn(`Symlink loop`)
        break
      }
      visited.add(self.path)
      self = self.target!
    }
    return self
  }

  get target (): this|null {
    const self = this
    const ctor = (this.constructor as { new(path: string): typeof self })
    return self.exists() ? new ctor(this.resolve(readlinkSync(this.path))) : null
  }

  /** Turn this entry into a symlink to `Path`. */
  pointTo (path: string): this {
    if ($(path).path === this.path) {
      throw new Error("Tried to create symlink that points to itself.")
    }
    if (this.exists()) this.delete()
    this.log.log('Pointing to', bold(path))
    symlinkSync(path, this.path)
    return this
  }

  /** Turn this entry into a symlink to an absolute path. */
  absLink (path: string|Path): this {
    return this.pointTo($(path).path)
  }

  /** Turn this entry into a symlink to a relative path. */
  relLink (path: string): this {
    return this.pointTo(path)
  }

  static separator = sep

}
