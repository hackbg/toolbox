export type Env = Record<string, string|undefined>

export class EnvConfigError extends Error {

  static Required = class EnvConfigRequiredError extends EnvConfigError {
    constructor (name: string, type: string) {
      super(`The environment variable ${name} must be a ${type}`)
    }
  }

}

export class EnvConfig {

  constructor (
    readonly env: Env    = {},
    readonly cwd: string = ''
  ) {}

  getNumber <T> (name: string, fallback?: ()=>T): number|T {
    if (this.env.hasOwnProperty(name)) {
      const value = (process.env[name]??'').trim()
      if (value === '') {
        if (fallback) {
          return fallback()
        } else {
          throw new EnvConfigError.Required(name, 'number')
        }
      }
      const number = Number(value)
      if (isNaN(number)) throw new EnvConfigError.Required(name, 'number')
      return number
    } else if (fallback) {
      return fallback()
    } else {
      throw new EnvConfigError.Required(name, 'number')
    }
  }

  getString <T> (name: string, fallback?: ()=>T): string|T {
    if (this.env.hasOwnProperty(name)) {
      return String(process.env[name] as string)
    } else if (fallback) {
      return fallback()
    } else {
      throw new EnvConfigError.Required(name, 'string')
    }
  }

  getBoolean <T> (name: string, fallback?: ()=>T): boolean|T {
    if (this.env.hasOwnProperty(name)) {
      const value = (process.env[name]??'').trim()
      return !this.FALSE.includes(value)
    } else if (fallback) {
      return fallback()
    } else {
      throw new EnvConfigError.Required(name, 'boolean')
      throw new Error(`The environment variable ${name} (boolean) is required.`)
    }
  }

  FALSE = [ '', 'false', 'no', '0' ]

}
