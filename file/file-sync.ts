import rimrafCb from 'rimraf'
import mkdirp from 'mkdirp'
import { Console, bold, colors, randomColor } from '@hackbg/logs'
import { base16, sha256 } from '@hackbg/4mat'
import { cwd } from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve, dirname, basename, relative, sep } from 'node:path'
import { Text } from './file-format'
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync, 
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'

import { Path } from './file-core'

class LocalPathSync extends Path {

  /** @returns absolute path to parent directory. */
  get parent (): LocalDirectorySync {
    return new LocalDirectorySync(this.dirname)
  }

  /** Create the parent directory of this.absolute. */
  makeParent (): this {
    this.parent.make()
    return this
  }

  get shortPath (): string {
    const relativePath = this.relativePath
    if (relativePath.length < this.absolute.length) {
      return relativePath
    } else {
      return this.absolute
    }
  }

  get relativePath (): string {
    return relative(cwd(), this.absolute) || '.'
  }

  /** @returns an instance of the passed class, pointing to this.absolute,
    * and (hopefully) knowing what to do with the data at this.absolute. */
  as <T, U extends { new (path: string): T }> (Ctor: U): T {
    return new Ctor(this.absolute)
  }

  exists () {
    try {
      return statSync(this.absolute)
    } catch (e) {
      if (e.code === 'ELOOP') {
        this.log.warn('circular symlink')
        return lstatSync(this.absolute)
      } else if (e.code === 'ENOENT') {
        return null
      } else {
        throw e
      }
    }
  }

  assert (): this {
    if (this.exists()) return this
    throw new Error(`${this.absolute} does not exist`)
  }

  make (): this {
    throw new Error("file or directory? use subclass")
  }

  /** @returns true if a directory exists at this.absolute */
  isDirectory (name?: string): boolean {
    const nameMatches = name ? (name === this.name) : true
    return !!(this.exists()?.isDirectory() && nameMatches)
  }

  /** @returns true if a file exists at this.absolute */
  isFile (name?: string): boolean {
    const nameMatches = name ? (name === this.name) : true
    return !!(this.exists()?.isFile() && nameMatches)
  }

  /** @returns true if this.absolute is a symlink. */
  get isLink (): boolean {
    return !!(this.exists() && lstatSync(this.absolute).isSymbolicLink())
  }

  delete (): this {
    if (this.exists()) {
      rimrafCb.sync(this.absolute)
    }
    return this
  }

  entrypoint <T> (command: (argv:string[])=>T): T|undefined {
    if (this.absolute === process.argv[1]) {
      return command(process.argv.slice(2))
    }
  }

  get real (): this {
    let self = this
    let visited = new Set<string>([])
    while (self.isLink) {
      if (visited.has(self.absolute)) {
        this.log.warn(`Symlink loop`)
        break
      }
      visited.add(self.absolute)
      self = self.target!
    }
    return self
  }

  get target (): this|null {
    const self = this
    const ctor = (this.constructor as { new(path: string): typeof self })
    return self.exists()
      ? new ctor(this.resolve(readlinkSync(this.absolute)))
      : null
  }

  /** Turn this entry into a symlink to `Path`. */
  pointTo (path: string): this {
    if (new Path(path).absolute === this.absolute) {
      throw new Error("Tried to create symlink that points to itself.")
    }
    if (this.exists()) this.delete()
    this.log.log('Pointing to', bold(path))
    symlinkSync(path, this.absolute)
    return this
  }

  /** Turn this entry into a symlink to an absolute path. */
  absLink (path: string|Path): this {
    return this.pointTo(new Path(path).absolute)
  }

  /** Turn this entry into a symlink to a relative path. */
  relLink (path: string): this {
    return this.pointTo(path)
  }

  static separator = sep

}

class LocalDirectorySync extends LocalPathSync {

  resolve (path: string): string {
    return resolve(this.absolute, path)
  }

  make () {
    mkdirp.sync(this.absolute)
    return this
  }

  list (ext?: string): string[]|null {
    if (!this.exists()) {
      return null
    }
    if (ext) {
      const match = (x: string) => x.endsWith(ext)
      const strip = (x: string) => basename(x, ext)
      return readdirSync(this.absolute)
        .filter(match)
        .map(strip)
    }
  }

  has (name: string) {
    return existsSync(this.resolve(name))
  }

  /** @returns Path to directory relative to this. */
  file (...fragments: string[]): LocalFileSync {
    return new LocalFileSync(this.absolute, ...fragments)
  }

  /** @returns Path to file relative to this. */
  subdir (...fragments: string[]): LocalDirectorySync {
    return new LocalDirectorySync(this.absolute, ...fragments)
  }

}

class LocalFileSync extends LocalPathSync {

  format: {
    load <T> (data: unknown): T
    save (data: unknown)
  } = Text

  setFormat (format: typeof this['format']) {
    this.format = format
    return this
  }

  resolve (path: string): string {
    return resolve(this.dirname, path)
  }

  make () {
    if (!existsSync(this.absolute)) {
      this.makeParent()
      writeFileSync(this.absolute, '')
    }
    return this
  }

  loadBinary (): Uint8Array {
    return new Uint8Array(readFileSync(this.absolute))
  }

  loadRaw (encoding: BufferEncoding = 'utf8'): string {
    return readFileSync(this.absolute, encoding)
  }

  load <T> (): T {
    if (!this.format) {
      throw Object.assign(new Error(`can't load file: unspecified format`), {
        path: this.absolute
      })
    }
    return this.format.load(readFileSync(this.absolute))
  }

  saveBinary (data: Uint8Array): this {
    writeFileSync(this.absolute, data)
    return this
  }

  saveRaw (data: string, encoding: BufferEncoding = 'utf8') {
    writeFileSync(this.absolute, data, encoding)
    return this
  }

  save (data: any): this {
    if (!this.format) {
      throw Object.assign(new Error(`can't load file: unspecified format`), {
        path: this.absolute
      })
    }
    this.makeParent()
    writeFileSync(this.absolute, this.format.save(data))
    return this
  }

  edit <T> (fn: (data: T)=>T): this {
    return this.save(fn(this.load()))
  }

  sha256 () {
    return base16.encode(sha256(this.loadBinary()))
  }

}

export {
  LocalPathSync as Path,
  LocalFileSync as File,
  LocalDirectorySync as Directory
}
