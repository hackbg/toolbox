import { mkdtempSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import _rimraf from 'rimraf'
import mkdirp from 'mkdirp'
import tmp from 'tmp'
import { Console, bold } from '@hackbg/logs'
import { Path } from './file-core'

const console = new Console('@hackbg/file')

export function getTmpDir (prefix = 'file-') {
  return new Path(mkdtempSync(new Path(tmpdir(), prefix).absolute))
}

export function getDirName (url: URL) {
  return dirname(fileURLToPath(url))
}

export function mkdir (...fragments: string[]) {
  const path = new Path(resolve(...fragments))
  if (!existsSync(path.absolute)) {
    mkdirp.sync(path.absolute, {mode: 0o770})
    new Console(`${path.short}`).log('Created (directory)')
  }
  return path
}

export function rimraf (path = "") {
  return new Promise((resolve, reject)=>_rimraf(path, (err: unknown) =>
    err ? reject(err) : resolve(path))
  )
}

export function withTmpDir <T> (
  fn: (path: string)=>T,
  { remove = true, prefix = 'temp-' }: { remove?: boolean, prefix?: string } = {}
): T {
  const name = mkdtempSync(resolve(tmpdir(), prefix))
  console.log(`Created temporary directory ${bold(name)}`, remove
    ? 'Will remove it on process exit.'
    : 'Will keep it after process exits.')
  if (remove) {
    process.on('beforeexit', () => {
      new Console(`${name}`).log('Removing temporary directory', name)
      _rimraf.sync(name)
    })
  }
  return fn(name)
}

export function withTmpFile <T> (fn: (path: string)=>T): T {

  const {name} = tmp.fileSync()

  try { return fn(name) } finally {
    _rimraf.sync(name)
  }

}
