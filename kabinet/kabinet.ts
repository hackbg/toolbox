import copy from 'recursive-copy'
import mkdirp from 'mkdirp'
import rimrafCb from 'rimraf'
import symlinkDir from 'symlink-dir'
import tmp from 'tmp'
import { cwd } from 'process'
import { tmpdir } from 'os'
import {
  existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdtempSync,
  symlinkSync, readlinkSync, lstatSync
} from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { resolve, dirname, basename, relative, sep } from 'path'
import TOML from 'toml'
import YAML from 'js-yaml'
import { CustomConsole } from '@hackbg/konzola'
import { Encoding, Crypto } from '@hackbg/formati'

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

  relative (path: Path|string): string {
    if (path instanceof Path) path = path.path
    return relative(this.path, path)
  }

  get name (): string {
    return basename(this.path)
  }

  get parent (): string {
    return dirname(this.path)
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

  /** FIXME */
  resolve (name: string): string {
    if (name.includes('/')) throw new Error(`invalid name: ${name}`)
    return resolve(this.path, basename(name))
  }

  exists (): boolean {
    return existsSync(this.path)
  }

  assert (): this {
    if (this.exists()) {
      return this
    } else {
      throw new Error(`${this.path} does not exist`)
    }
  }

  isDirectory (name?: string): boolean {
    const nameMatches = name ? (name === this.name) : true
    return this.exists() && statSync(this.path).isDirectory() && nameMatches
  }

  isFile (name?: string): boolean {
    const nameMatches = name ? (name === this.name) : true
    return this.exists() && statSync(this.path).isFile() && nameMatches
  }

  delete (): this {
    rimrafSync(this.path)
    return this
  }

  makeParent (): this {
    mkdirp.sync(dirname(this.path))
    return this
  }

  make (): this {
    throw new Error("@hackbg/kabinet: file or directory? use subclass")
  }

  entrypoint <T> (command: (argv:string[])=>T): T|undefined {
    if (this.path === process.argv[1]) {
      return command(process.argv.slice(2))
    }
  }

  pointTo (path: string|Path): this {
    symlinkSync($(path).path, this.path)
    return this
  }

  get real (): this {
    const self = this
    return new (this.constructor as { new(path: string): typeof self })(readlinkSync(this.path))
  }

  get isLink (): boolean {
    return lstatSync(this.path).isSymbolicLink()
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
    return Encoding.toHex(new Crypto.Sha256(this.load()).digest())
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
  if (!existsSync(path)) log.info('Creating directory:', path)
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
  if (!existsSync(path)) log.info('Creating file:', path)
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
