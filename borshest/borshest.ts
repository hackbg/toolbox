import type { Field, AnyField } from './borsh-base'
import { Writer, Reader } from './borsh-base'
import { struct } from './borsh-struct'

export type Fields = [string, AnyField][]

export function encode <T> (schema: Field<T>, decoded: T): Uint8Array {
  const writer = new Writer()
  schema.encode(writer, decoded)
  return new Uint8Array(writer.buffer)
}

export function decode <T> (schema: Field<T>, encoded: Uint8Array|Array<number>): T {
  if (!(encoded instanceof Uint8Array)) encoded = new Uint8Array(encoded)
  return schema.decode(new Reader(encoded))
}

export function Struct (...fields: [string, AnyField][]) {
  const schema = struct(...fields)
  return class Struct {
    static decode (encoded: Uint8Array) {
      return new this(decode(schema, encoded) as Record<string, unknown>)
    }
    constructor (data: Record<string, unknown>) {
      for (const [key, _] of fields) {
        Object.assign(this, { [key]: data[key] })
      }
    }
  }
}

export type {
  Field,
  AnyField
} from './borsh-base'

export {
  unit,
} from './borsh-base'

export {
  bool,
  option
} from './borsh-bool'

export {
  unsigned,
  u8,
  u16,
  u32,
  u64,
  u128,
  u256,
  signed,
  i8,
  i16,
  i32,
  i64,
  i128,
  i256,
  float,
  f32,
  f64,
} from './borsh-number'

export {
  string
} from './borsh-string'

export {
  array,
  vec,
  set,
  map,
  zVec
} from './borsh-collection'

export {
  struct
} from './borsh-struct'

export {
  variants,
  variant
} from './borsh-enum'
