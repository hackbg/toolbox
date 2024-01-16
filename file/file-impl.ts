export function getDirName (url: URL) {
  return dirname(fileURLToPath(url))
}

export function mkdir (...fragments: string[]) {
  const path = $(resolve(...fragments))
  if (!existsSync(path.path)) {
    mkdirp.sync(path.path, {mode: 0o770})
    new Console(`${path.shortPath}`).log('Created (directory)')
  }
  return path
}

export function rimraf (path = "") {
  return new Promise((resolve, reject)=>rimrafCb(path, (err: unknown) =>
    err ? reject(err) : resolve(path))
  )
}

export function withTmpDir <T> (
  fn: (path: string)=>T,
  remove = true
): T {
  const name = mkdtempSync(resolve(tmpdir(), 'temp-'))
  log.sub(name).log('Created temporary directory.', remove
    ? 'Will remove it on process exit.'
    : 'Will keep it after process exits.')
  if (remove) {
    process.on('exit', () => {
      new Console(`${name}`).log('Removing temporary directory', name)
      rimrafSync(name)
    })
  }
  return fn(name)
}

export function withTmpFile <T> (fn: (path: string)=>T): T {
  const {name} = tmp.fileSync()
  try { return fn(name) } finally { rimrafSync(name) }
}

export function touch (...fragments: string[]) {
  const path = $(resolve(...fragments))
  if (!existsSync(path.path)) {
    new Console(`${path.shortPath}`).log('Creating (file)')
    writeFileSync(path.path, '')
  }
  return path
}

/** Based on:
  * - https://github.com/jonschlinkert/align-yaml
  * - https://github.com/jonschlinkert/longest
  * - https://github.com/jonschlinkert/repeat-string/blob/master/index.js
  * by Jon Schlinkert, used under MIT license. */
export function alignYAML (str: string, pad: number = 0) {
  const props: string[] = str.match(/^\s*[\S]+:/gm) || []
  const longest = props.reduce((x: number, str: string)=>Math.max(x, str.length), 0) + pad
  return str.split('\n').map(function(str) {
    const line = /^(\s*.+[^:#]: )\s*(.*)/gm
    return str.replace(line, function(match, $1, $2) {
      const len = longest - $1.length + 1
      const padding = [...Array(len)].map(()=>' ').join('')
      return $1 + padding + $2
    })
  }).join('\n')
}

