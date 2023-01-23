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
