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

export class Directory extends BaseDirectory<never, File> {
  get File () {
    return File
  }
}

export class JSONDirectory<T> extends BaseDirectory<T, JSONFile<T>> {
  get File () {
    return JSONFile
  }
}

export class YAMLDirectory<T> extends BaseDirectory<T, YAMLFile<T>> {
  get File () {
    return YAMLFile
  }
}

export class TOMLDirectory<T> extends BaseDirectory<T, TOMLFile<T>> {
  get File () {
    return TOMLFile
  }
}
