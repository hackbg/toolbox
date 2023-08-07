import { overrideFiltered } from '@hackbg/over'

export class ConfigError extends Error {
  static Required = class EnvConfigRequiredError extends ConfigError {
    constructor (name, type) {
      super(`The environment variable ${name} must be a ${type}`)
    }
  }
}

export class Config {
  constructor (environment = Environment.initial) {
    this.environment = environment
  }
  override (options) {
    overrideFiltered(false, this, options)
    return this
  }
  getFlag (name, fallback) {
    return this.environment.getFlag(name, fallback)
  }
  getString (name, fallback) {
    return this.environment.getString(name, fallback)
  }
  getNumber (name, fallback) {
    return this.environment.getNumber(name, fallback)
  }
}

export class Environment {
  constructor (cwd, vars = {}, tag = String(+new Date())) {
    this.cwd  = cwd
    this.vars = vars
    this.tag  = tag
    Object.defineProperty(this, 'vars', { configurable: true, enumerable: false })
  }

  get [Symbol.toStringTag]() { return this.tag }

  getFlag (name, fallback) {
    if (name in this.vars) {
      const value = (this.vars[name]??'').trim()
      return !Environment.FALSE.includes(value)
    }
    if (fallback) return fallback()
    throw new ConfigError.Required(name, 'boolean')
  }

  getString (name, fallback) {
    if (name in this.vars) return String(this.vars[name])
    if (fallback) return fallback()
    throw new ConfigError.Required(name, 'string')
  }

  getNumber (name, fallback) {
    if (name in this.vars) {
      const value = (this.vars[name]??'').trim()
      if (value === '') {
        if (fallback) return fallback()
        throw new ConfigError.Required(name, 'number')
      }
      const number = Number(value)
      if (isNaN(number)) throw new ConfigError.Required(name, 'number')
      return number
    } else if (fallback) {
      return fallback()
    } else {
      throw new ConfigError.Required(name, 'number')
    }
  }

  /** Snapshot of the earliest known process environment
    * (at the moment this module is evaluated) */
  static initial = new Environment(
    globalThis.process?.cwd(),
    globalThis.process?.env
  )

  /** Which string values are counted as falsy by getFlag */
  static FALSE = [ '', 'false', 'no', '0' ]
}
