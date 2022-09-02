/** A ***value object*** that allows its meaningful properties to be overridden.
  * For the override to work, empty properties must be defined as:
  *
  *     class Named extends Overridable {
  *         name?: Type = undefined
  *     }
  *
  * (Otherwise Object.getOwnPropertyNames wouldn't see the property slots,
  * and `new Named.where({ name: 'something' })` wouldn't update `name`.
  * This is because of how TypeScript handles class properties;
  * in raw JS, they seem to be defined as undefined by default?)
  *
  * Even in when not inheriting from `Overridable`, try to follow the pattern of
  * ***immutable value objects*** which represent a piece of state in context
  * and which, instead of mutating themselves, emit changed copies of themselves
  * using the idioms:
  *     this.where({ name: 'value' }) // internally
  * or:
  *     new Named(oldNamed, { name: 'value' }) // externally.
  **/
export class Overridable {
  override (options: object = {}) {
    override(false, this, options)
  }
  /** Return copy of self with overridden properties. */
  where (options: Partial<this> = {}) {
    return new (this.constructor as any)(this, options)
  }
}

type valof<T> = T[keyof T]

/** Override only allowed properties. */
export function override (
  /** Whether to fail on unexpected properties. */
  strict:    boolean,
  /** The object being overridden. */
  self:      object,
  /** The object containing the overrides. */
  overrides: object,
  /** List of allowed properties (defaults to the defined properties on the object;
    * that's why many fields explicitly default to `undefined` - otherwise TypeScript
    * does not generate them, somewhat contrarily to native JS class behavior) */
  allowed:   string[] = Object.getOwnPropertyNames(self),
): Record<string, valof<typeof overrides>> {
  const filtered: Record<string, valof<typeof overrides>> = {}
  for (const [key, val] of Object.entries(overrides)) {
    if (val === undefined) continue
    if (allowed.includes(key)) {
      const current: typeof val = (self as any)[key]
      if (strict && current && current !== val) {
        throw new Error(`Tried to override pre-defined ${key}`)
      }
      ;(self as any)[key] = val
    } else {
      (filtered as any)[key] = val
    }
  }
  return filtered
}

export type Env = Record<string, string|undefined>

export class EnvConfig extends Overridable {

  constructor (
    readonly env: Env    = {},
    readonly cwd: string = '',
    defaults: Partial<EnvConfig> = {}
  ) {
    super()
    Object.defineProperty(this, 'env', { writable: true, enumerable: false })
    Object.defineProperty(this, 'cwd', { writable: true, enumerable: false })
    this.override(defaults)
  }

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
      return !EnvConfig.FALSE.includes(value)
    } else if (fallback) {
      return fallback()
    } else {
      throw new EnvConfigError.Required(name, 'boolean')
      throw new Error(`The environment variable ${name} (boolean) is required.`)
    }
  }

  static FALSE = [ '', 'false', 'no', '0' ]

}

export class EnvConfigError extends Error {

  static Required = class EnvConfigRequiredError extends EnvConfigError {
    constructor (name: string, type: string) {
      super(`The environment variable ${name} must be a ${type}`)
    }
  }

}
