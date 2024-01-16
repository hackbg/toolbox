import { Path } from './file-core'

export class LocalPathAsync extends Path {
  constructor (...args: any[]) {
    throw new Error('async fs op classes: not implemented yet')
    super(...args)
  }
}

export class LocalDirectoryAsync extends LocalPathAsync {
}

export class LocalFileAsync extends LocalPathAsync {
}

export {
  LocalPathAsync as Path,
  LocalFileAsync as File,
  LocalDirectoryAsync as Directory
}
