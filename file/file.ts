export * as SyncFS from './file-sync'
export * as AsyncFS from './file-async'
export * as FileFormat from './file-format'
export { default as copy } from 'recursive-copy'
export { default as symlinkDir } from 'symlink-dir'
export { default as XDG } from '@folder/xdg'

export default function $ (base: string|URL|Path, ...fragments: string[]): Path {
  return new Path(base, ...fragments)
}

$.file = function getFile (base: string|URL|Path, ...fragments: string[]) {
  return $(base, ...fragments).as(LocalFile)
}

$.directory = function getDirectory (base: string|URL|Path, ...fragments: string[]) {
  return $(base, ...fragments).as(LocalDirectory)
}

$.tmpDir = function getTmpDir (prefix = 'file-'): Path {
  return $(mkdtempSync($(tmpdir(), prefix).path))
}

