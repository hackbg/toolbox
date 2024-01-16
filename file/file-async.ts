import { Path } from './file-core'

export class LocalPathAsync extends Path {
  constructor (...args: any[]) {
    throw new Error('async fs op classes: not implemented yet')
    super(...args)
  }
}

export class LocalDirectoryAsync extends Path {
}

export class LocalFileAsync extends Path {
}
