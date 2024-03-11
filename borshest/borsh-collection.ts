import type { Field, EncodeBuffer, DecodeBuffer } from './borsh-base'
import { expectSameSize } from './borsh-validate'
import { u32 } from './borsh-number'

/** A fixed-length ordered collection. */
export const array = <T>(size: number, element: Field<T>): Field<T[]> => ({
  encode (buffer: EncodeBuffer, value: T[]) {
    if (value.length !== size) {
      throw new Error(`Expected array of size ${size}, got ${value.length}`)
    }
    for (let i = 0; i < size; i++) {
      element.encode(buffer, value[i])
    }
  },
  decode (buffer: DecodeBuffer): T[] {
    const result = [];
    for (let i = 0; i < size; ++i) {
      result.push(element.decode(buffer))
    }
    return result;
  }
})

/** A variable-length ordered collection. */
export const vec = <T>(element: Field<T>): Field<T[]> => ({
  encode (buffer: EncodeBuffer, value: T[]) {
    u32.encode(buffer, BigInt(value.length))
    for (let i = 0; i < value.length; i++) {
      element.encode(buffer, value[i])
    }
  },
  decode (buffer: DecodeBuffer): T[] {
    const size = Number(u32.decode(buffer))
    const result = []
    for (let i = 0; i < size; ++i) result.push(element.decode(buffer))
    return result
  }
})

/** A variable-length unordered collection. */
export const set = <T>(element: Field<T>): Field<Set<T>> => ({
  encode (buffer: EncodeBuffer, value: Set<T>|(T[])) {
    const isSet = value instanceof Set
    const values = isSet ? Array.from(value.values()) : Object.values(value)
    buffer.writeNumber(values.length, 'u32') // 4 bytes for length
    for (const value of values) { // set values
      element.encode(buffer, value)
    }
  },
  decode (buffer: DecodeBuffer): Set<T> {
    const size = Number(u32.decode(buffer))
    const result = new Set<T>()
    for (let i = 0; i < size; ++i) result.add(element.decode(buffer))
    return result;
  }
})

/** A key-value map. */
export const map = <K extends string|number|symbol, V>(k: Field<K>, v: Field<V>): Field<Map<K, V>> => ({
  encode (buffer: EncodeBuffer, value: Record<K, V>|Map<K, V>) {
    const isMap = value instanceof Map;
    const keys = isMap ? Array.from(value.keys()) : Object.keys(value)
    buffer.writeNumber(keys.length, 'u32') // 4 bytes for length
    for (const key of keys) { // store key/values
      k.encode(buffer, key as K)
      v.encode(buffer, isMap ? value.get(key as K) : value[key as K])
    }
  },
  decode (buffer: DecodeBuffer): Map<K, V> {
    const size = Number(u32.decode(buffer))
    const result = new Map()
    for (let i = 0; i < size; ++i) result.set(k.decode(buffer), v.decode(buffer))
    return result
  }
})

function isArrayLike (value: unknown): boolean {
  // source: https://stackoverflow.com/questions/24048547/checking-if-an-object-is-array-like
  return Array.isArray(value) || (!!value &&
    typeof value === 'object' &&
    'length' in value &&
    typeof (value.length) === 'number' &&
    (value.length === 0 ||
      (value.length > 0 &&
        (value.length - 1) in value)
    )
  )
}
