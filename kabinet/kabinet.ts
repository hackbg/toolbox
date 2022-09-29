import copy from 'recursive-copy'
import mkdirp from 'mkdirp'
import rimrafCb from 'rimraf'
import symlinkDir from 'symlink-dir'
import tmp from 'tmp'
import { cwd } from 'process'
import { tmpdir } from 'os'
import {
  existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdtempSync,
  symlinkSync, readlinkSync, lstatSync, unlinkSync
} from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { resolve, dirname, basename, relative, sep } from 'path'
import TOML from 'toml'
import YAML from 'js-yaml'
import { CustomConsole, bold } from '@hackbg/konzola'
import { base16, sha256 } from '@hackbg/formati'

const log = new CustomConsole('@hackbg/kabinet')

const rimrafSync = rimrafCb.sync

export default function $ (base: string|URL|Path, ...fragments: string[]): Path {
  return new Path(base, ...fragments)
}

$.tmpDir = function getTmpDir (prefix = 'kabinet-'): Path {
  return $(mkdtempSync($(tmpdir(), prefix).path))
}

/** Represents a path to a filesystem entity, i.e. a file or directory. */
export class Path {

  static separator = sep

  constructor (base: string|URL|Path = cwd(), ...fragments: string[]) {
    if (base instanceof URL || (typeof base === 'string' && base.startsWith('file://'))) {
      base = fileURLToPath(base)
    } else if (typeof base === 'object') {
      base = base.path
    }
    this.path = resolve(base, ...fragments)
  }

  /** The represented path. */
  path: string

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

  get name (): string {
    return basename(this.path)
  }

  get parent (): string {
    return dirname(this.path)
  }

  makeParent (): this {
    mkdirp.sync(dirname(this.path))
    return this
  }

  get shortPath (): string {
    return relative(cwd(), this.path) || '.'
  }

  /** Return a Path pointing of a subdirectory of the current one. */
  at (...fragments: string[]): Path {
    const sub = new (this.constructor as PathCtor<typeof this>)(this.path, ...fragments)
    if (sub.isDirectory()) {
      throw new Error(`@hackbg/kabinet: Path#at: use .in() to descend into directory: ${sub.path}`)
    }
    return sub
  }

  /** Return a Path pointing of a file in the current directory. */
  in (...fragments: string[]): Path {
    const sub = new (this.constructor as PathCtor<typeof this>)(this.path, ...fragments)
    if (sub.isFile()) {
      throw new Error(`@hackbg/kabinet: use .at() to point to file: ${sub.path}`)
    }
    return sub
  }

  /** Convert this Path into a class that knows what to do with
    * the data at the represented path. */
  as <T, U extends BaseFile<T>|BaseDirectory<T, BaseFile<T>>> (Ctor: PathCtor<U>): U {
    return new Ctor(this.path)
  }

  exists () {
    try {
      return statSync(this.path)
    } catch (e) {
      if (e.code === 'ELOOP') {
        log.warn('Circular symlink at', bold(this.shortPath))
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
    throw new Error("@hackbg/kabinet: file or directory? use subclass")
  }

  /** @returns true if a directory exists at this.path */
  isDirectory (name?: string): boolean {
    const nameMatches = name ? (name === this.name) : true
    return this.exists()?.isDirectory() && nameMatches
  }

  /** @returns true if a file exists at this.path */
  isFile (name?: string): boolean {
    const nameMatches = name ? (name === this.name) : true
    return this.exists()?.isFile() && nameMatches
  }

  get isLink (): boolean {
    return this.exists() && lstatSync(this.path).isSymbolicLink()
  }

  delete (): this {
    if (this.exists()) {
      log.log('Deleting:', bold(this.shortPath))
      rimrafSync(this.path)
    } else {
      log.log('Already deleted:', this.shortPath)
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
    let visited = new Set([])
    while (self.isLink) {
      if (visited.has(self.path)) {
        log.warn(`Symlink loop encountered at`, bold(self.path))
        break
      }
      visited.add(self.path)
      self = self.target
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
    log.log('Pointing:', bold(this.shortPath), 'to', bold(path))
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

}

export interface PathCtor <T> {
  new (...fragments: string[]): T
}

export abstract class BaseFile<T> extends Path {
  make () {
    this.makeParent()
    touch(this.path)
    return this
  }
  abstract load (): T
  abstract save (data: T): this
}

export class OpaqueFile extends BaseFile<never> {
  static extension = ''
  load (): never {
    throw new Error("OpaqueFile: not meant to be loaded")
  }
  save (data: never): never {
    throw new Error("OpaqueFile: not meant to be saved")
  }
}

export class BinaryFile extends BaseFile<Buffer> {
  static extension = ''
  load () {
    return readFileSync(this.path)
  }
  save (data: Uint8Array): this {
    this.makeParent()
    writeFileSync(this.path, data)
    return this
  }
  get sha256 () {
    return base16.encode(sha256(this.load()))
  }
}

export class TextFile extends BaseFile<string> {
  static extension = ''
  load () {
    return readFileSync(this.path, 'utf8')
  }
  save (data: string) {
    this.makeParent()
    writeFileSync(this.path, data, 'utf8')
    return this
  }
}

export class JSONFile<T> extends BaseFile<T> {
  static extension = '.json'
  load () {
    return JSON.parse(readFileSync(this.path, 'utf8')) as T
  }
  save (data: unknown) {
    this.makeParent()
    writeFileSync(this.path, JSON.stringify(data, null, 2), 'utf8')
    return this
  }
}

export class YAMLFile<T> extends BaseFile<T> {
  static extension = '.yaml'
  load () {
    return YAML.load(readFileSync(this.path, 'utf8')) as T
  }
  loadAll () {
    return YAML.loadAll(readFileSync(this.path, 'utf8')) as T[]
  }
  save (data: unknown) {
    this.makeParent()
    writeFileSync(this.path, YAML.dump(data), 'utf8')
    return this
  }
}

export class TOMLFile<T> extends BaseFile<T> {
  static extension = '.toml'
  load () {
    return TOML.parse(readFileSync(this.path, 'utf8')) as T
  }
  save (data: never) {
    throw new Error('TOML serialization not supported')
    return this
  }
}

export interface FileCtor <T> extends PathCtor <T> {
  extension: string
}

export abstract class BaseDirectory<T, U extends BaseFile<T>> extends Path {
  abstract File: FileCtor<U>
  file (...fragments: string[]) {
    const File = this.File
    return new File(this.path, ...fragments)
  }
  make () {
    mkdirp.sync(this.path)
    return this
  }
  list (): string[]|null {
    if (!this.exists) return null
    const matchExtension = (x: string) => x.endsWith(this.File.extension)
    const stripExtension = (x: string) => basename(x, this.File.extension)
    return readdirSync(this.path).filter(matchExtension).map(stripExtension)
  }
  has (name: string) {
    return existsSync(this.resolve(`${name}${JSONFile.extension}`))
  }
}

export class OpaqueDirectory extends BaseDirectory<never, OpaqueFile> {
  get File () { return OpaqueFile }
}

export class JSONDirectory<T> extends BaseDirectory<T, JSONFile<T>> {
  get File () { return JSONFile }
}

export class YAMLDirectory<T> extends BaseDirectory<T, YAMLFile<T>> {
  get File () { return YAMLFile }
}

export class TOMLDirectory<T> extends BaseDirectory<T, TOMLFile<T>> {
  get File () { return TOMLFile }
}

export function getDirName (url: URL) {
  return dirname(fileURLToPath(url))
}

export function mkdir (...fragments: string[]) {
  const path = resolve(...fragments)
  if (!existsSync(path)) log.log('Creating directory:', $(path).shortPath)
  mkdirp.sync(path, {mode: 0o770})
  return path
}

export function rimraf (path = "") {
  return new Promise((resolve, reject)=>rimrafCb(path, (err: unknown) =>
    err ? reject(err) : resolve(path))
  )
}

export function withTmpDir <T> (fn: (path: string)=>T): T {
  const {name} = tmp.dirSync()
  try { return fn(name) } finally { rimrafSync(name) }
}

export function withTmpFile <T> (fn: (path: string)=>T): T {
  const {name} = tmp.fileSync()
  try { return fn(name) } finally { rimrafSync(name) }
}

export function touch (...fragments: string[]) {
  const path = resolve(...fragments)
  if (!existsSync(path)) log.log('Creating file:', $(path).shortPath)
  writeFileSync(path, '')
  return path
}

/** Based on:
  * - https://github.com/jonschlinkert/align-yaml
  * - https://github.com/jonschlinkert/longest
  * - https://github.com/jonschlinkert/repeat-string/blob/master/index.js
  * by Jon Schlinkert, used under MIT license. */
export function alignYAML (str: string, pad: number = 0) {
  const props   = str.match(/^\s*[\S]+:/gm) || []
  const longest = props.reduce((x, str)=>Math.max(x, str.length), 0) + pad
  return str.split('\n').map(function(str) {
    const line = /^(\s*.+[^:#]: )\s*(.*)/gm
    return str.replace(line, function(match, $1, $2) {
      const len = longest - $1.length + 1
      const padding = [...Array(len)].map(()=>' ').join('')
      return $1 + padding + $2
    })
  }).join('\n')
}

// reexports
export {
  copy,
  symlinkDir,
}
