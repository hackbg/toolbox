import type { Field, AnyField, EncodeBuffer, DecodeBuffer } from './borsh-base'

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
        `struct fields #${i} must look like: ["name", { encode(), decode() }]`
      )
    }
  }

  return {

    encode (buffer: EncodeBuffer, value: T) {
      for (const [key, element] of fields) element.encode(buffer, value[key])
    },

    decode (buffer: DecodeBuffer): T {
      const result: Partial<T> = {};
      for (const [key, element] of fields) result[key] = element.decode(buffer)
      return result as T
    }

  }

}
