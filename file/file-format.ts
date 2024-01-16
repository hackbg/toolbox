import _TOML from 'toml'
import _YAML from 'js-yaml'

export class JSON {
  static defaultExtension = '.json'
  static load = (data) => JSON.parse(data)
  static save = (data: unknown) => JSON.stringify(data, null, 2)
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
  static save = <T>(data: T) => _YAML.dumpAll(data, { skipInvalid: true })
}
