export class ValidationFailed extends Error {
  constructor (kind: string, expected: any, actual: any) {
    super(`Validation failed: ${kind}. Expected ${expected}, got ${actual}`)
  }
}

/** Throw if fetched metadata differs from configured. */
export function validated <T> (kind: string, value: T, expected?: T): T {
  if (typeof value === 'string' && typeof expected === 'string') {
    value = value.toLowerCase() as unknown as T
  }
  if (typeof expected === 'string') {
    expected = expected.toLowerCase() as unknown as T
  }
  if (typeof expected !== 'undefined' && expected !== value) {
    throw new ValidationFailed(kind, expected, value)
  }
  return value
}

/// Here I try to figure out a comfortable Value Object pattern
/// that is not vulnerable to prototype injection and disallows
/// extra fields to be tacked on - while maintaining minimal verbosity.

/** Check if `obj` has a writable, non-method property of name `key` */
export function hasField <T extends object> (obj: T, key: keyof typeof obj): boolean {
  const exists = key in obj
  const descriptor = Object.getOwnPropertyDescriptor(obj, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), key)
  const isWritable = descriptor?.writable ?? true
  const isGetter   = descriptor?.get ?? false
  const isFunction = (typeof obj[key as keyof T] === 'function') && !((obj[key as keyof T] as unknown as Function).prototype)
  return exists && isWritable && !isFunction && !isGetter
}

/** Set fields of first argument to values from second argument,
  * intelligently avoiding non-existent, read-only and method fields.
  * Opposite of `fallback`. */
export function override <T extends object> (obj: T, options: Partial<T> = {}): T {
  for (const [key, val] of Object.entries(options)) {
    if (val === undefined) continue
    if (hasField(obj, key as keyof T)) Object.assign(obj, { [key]: val })
  }
  return obj
}

/** Sets fields of first argument to values from second argument,
  * intelligently avoiding non-existent, read-only and method fields -
  * but only if the field is not already set. Opposite of `override`. */
export function fallback <T extends object> (obj: T, options: Partial<T> = {}): T {
  for (const [key, val] of Object.entries(options)) {
    if (val === undefined) continue
    const val2 = obj[key as keyof T] as any
    if (hasField(obj, key as keyof T)) Object.assign(obj, { [key]: val ?? val2 })
  }
  return obj
}

/** Default fields start out as getters that point to the corresponding field
  * on the context; but if you try to set them, they turn into normal properties
  * with the provided value. */
export function defineDefault <T extends object, D extends object> (
  obj: T, defaults: D, name: keyof D
) {
  if (!obj[name as unknown as keyof T]) {
    Object.defineProperty(obj, name, {
      configurable: true,
      enumerable: true,
      get () {
        return defaults[name]
      },
      set (v: D[keyof D]) {
        Object.defineProperty(obj, name, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: v
        })
        return v
      }
    })
  }
}

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
    overrideFiltered(false, this, options)
  }
  /** Return copy of self with overridden properties. */
  where (options: Partial<this> = {}) {
    return new (this.constructor as any)(this, options)
  }
}

type valof<T> = T[keyof T]

/** Override only allowed properties. */
export function overrideFiltered (
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
