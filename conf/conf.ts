import { overrideFiltered } from '@hackbg/over'

export class ConfigError extends Error {
  static Required = class EnvConfigRequiredError extends ConfigError {
    constructor (name: string, type: string) {
      super(`The environment variable ${name} must be a ${type}`)
    }
  }
}

export class Config {
  constructor (readonly environment: Environment = Environment.initial) {}
  override (options: object) {
    overrideFiltered(false, this, options)
    return this
  }
  getFlag <T extends boolean, U> (name: string, fallback?: ()=>T|U): T|U {
    return this.environment.getFlag<T, U>(name, fallback)
  }
  getString <T extends string, U> (name: string, fallback?: ()=>T|U): T|U {
    return this.environment.getString<T, U>(name, fallback)
  }
  getNumber <T extends number, U> (name: string, fallback?: ()=>T|U): T|U {
    return this.environment.getNumber<T, U>(name, fallback)
  }
}

export class Environment {
  constructor (
    /** Current working directory. */
    readonly cwd:  string             = '',
    /** Environment variables */
    readonly vars: typeof process.env = {},
    /** Tag to identify the environment (e.g. timestamp) */
    readonly tag:  string|undefined = String(+new Date())
  ) {
    Object.defineProperty(this, 'vars', { configurable: true, enumerable: false })
  }

  get [Symbol.toStringTag]() { return this.tag }

  getFlag <T extends boolean, U> (name: string, fallback?: ()=>T|U): T|U {
    if (name in this.vars) {
      const value = (this.vars[name]??'').trim()
      return !Environment.FALSE.includes(value) as T
    }
    if (fallback) return fallback()
    throw new ConfigError.Required(name, 'boolean')
  }

  getString <T extends string, U> (name: string, fallback?: ()=>T|U): T|U {
    if (name in this.vars) return String(this.vars[name] as string) as T
    if (fallback) return fallback()
    throw new ConfigError.Required(name, 'string')
  }

  getNumber <T extends number, U> (name: string, fallback?: ()=>T|U): T|U {
    if (name in this.vars) {
      const value = (this.vars[name]??'').trim()
      if (value === '') {
        if (fallback) return fallback()
        throw new ConfigError.Required(name, 'number')
      }
      const number = Number(value)
      if (isNaN(number)) throw new ConfigError.Required(name, 'number')
      return number as T
    } else if (fallback) {
      return fallback()
    } else {
      throw new ConfigError.Required(name, 'number')
    }
  }

  /** Snapshot of the earliest known process environment
    * (at the moment this module is evaluated) */
  static initial = new Environment(process.cwd(), process.env)

  /** Which string values are counted as falsy by getFlag */
  static FALSE = [ '', 'false', 'no', '0' ]
}
