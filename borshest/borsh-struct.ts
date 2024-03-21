import type { Field, AnyField, Writer, Reader } from './borsh-base'

/** A structure with pre-defined fields of various types. */
export const struct = <T>(...fields: [string, AnyField][]): Field<T> => {

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    if (!(
      (fields[i] instanceof Array) &&
      (fields[i].length === 2) &&
      (typeof fields[i][0] === 'string') &&
      (!!fields[i][1]) &&
      (typeof fields[i][1] === 'object') &&
      (typeof fields[i][1].encode === 'function') &&
      (typeof fields[i][1].decode === 'function')
    )) {
      throw new Error(
        `struct field #${i} must look like: ["name", { encode(), decode() }], found: ${field}`
      )
    }
  }

  return {

    encode (buffer: Writer, value: T) {
      for (const [key, element] of fields) element.encode(buffer, value[key])
    },

    decode (buffer: Reader): T {
      const result: Partial<T> = {};
      for (const [key, element] of fields) {
        try {
          result[key] = element.decode(buffer)
        } catch (e) {
          ;(e as any).structPath ??= []
          ;(e as any).structPath.unshift(key)
          throw e
        }
      }
      return result as T
    }

  }

}
