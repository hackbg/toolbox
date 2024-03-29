import type { Field, AnyField, Writer, Reader } from './borsh-base'

/** An enum variant which may have additional data attached. */
export const variants = <T extends object>(...variants: [string, AnyField][]): Field<T> => {

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i]
    if (!(
      (variants[i] instanceof Array) &&
      (variants[i].length === 2) &&
      (typeof variants[i][0] === 'string') &&
      (!!variants[i][1]) &&
      (typeof variants[i][1] === 'object') &&
      (typeof variants[i][1].encode === 'function') &&
      (typeof variants[i][1].decode === 'function')
    )) {
      throw new Error(
        `struct fields #${i} must look like: ["name", { encode(), decode() }]`
      )
    }
  }

  return {

    encode (buffer: Writer, value: T) {
      const [valueKey, valueData] = variant<T, keyof T>(value)

      for (let i = 0; i < variants.length; i++) {
        const [key, field] = variants[i]
        if (key === valueKey) {
          buffer.writeNumber(i, 'u8')
          return field.encode(buffer, valueData)
        }
      }

      const keys = variants.map(v=>v[0]).join('|')
      throw new Error(`Variant "${String(valueKey)}" not found in enum. Valid are ${keys}`)
    },

    decode (buffer: Reader): T {
      const index = Number(buffer.readNumber('u8'))
      if (index > variants.length) {
        throw new Error(`enum option ${index} is not available`);
      }
      const [key, field] = variants[index]
      try {
        return { [key]: field.decode(buffer) } as T
      } catch (e) {
        ;(e as any).structPath ??= []
        ;(e as any).structPath.unshift(`/${key}`)
        throw e
      }
    }

  }

}

export function variant <T extends object, K extends keyof T> (object: T): [K, T[K]] {
  const keys = Object.keys(object) as K[]
  if (keys.length !== 1) {
    throw new Error('enum variant should have exactly 1 key')
  }
  return [keys[0], object[keys[0]]]
}
