import type { Field, AnyField, EncodeBuffer, DecodeBuffer } from './borsh-base'

/** A structure with pre-defined fields of various types. */
export const struct = <T>(...fields: [string, AnyField][]): Field<T> => ({

  encode (buffer: EncodeBuffer, value: T) {
    for (const [key, element] of fields) {
      element.encode(buffer, value[key])
    }
  },

  decode (buffer: DecodeBuffer): T {
    const result: Partial<T> = {};
    for (const [key, element] of fields) {
      result[key] = element.decode(buffer)
    }
    return result as T
  }

})

