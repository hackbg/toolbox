import _TOML from 'toml'
import _YAML from 'js-yaml'

export class JSON {
  static defaultExtension = '.json'
  static load = (data) => globalThis.JSON.parse(data)
  static save = (data: unknown) => globalThis.JSON.stringify(data, null, 2)
}

export class TOML {
  static defaultExtension = '.toml'
  static load = data => _TOML.parse(data)
  static save = <T>(data: T) => {
    throw new Error('TOML serialization not supported')
    return this
  }
}

export class YAML {
  static defaultExtension = '.yaml'
  static load = (data) => _YAML.load(data)
  static save = <T>(data: T) => _YAML.dump(data, { skipInvalid: true })
}

export class MultiYAML {
  static defaultExtension = '.yaml'
  static load = data => _YAML.loadAll(data)
  static save = <T>(data: T) => _YAML.dump(data, { skipInvalid: true })

  /** Based on:
    * - https://github.com/jonschlinkert/align-yaml
    * - https://github.com/jonschlinkert/longest
    * - https://github.com/jonschlinkert/repeat-string/blob/master/index.js
    * by Jon Schlinkert, used under MIT license. */
  static align = (str: string, pad: number = 0) => {
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
}
