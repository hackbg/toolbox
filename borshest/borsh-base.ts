import type { EncodeBuffer, DecodeBuffer } from './borsh-buffer'

export type AnyField = {
  encode (buffer: EncodeBuffer, value: unknown)
  decode (buffer: DecodeBuffer): unknown
}

export type Field<T> = {
  encode (buffer: EncodeBuffer, value: T)
  decode (buffer: DecodeBuffer): T
}

/** The unit type (empty). */
export const unit: Field<void> = ({
  encode (buffer: EncodeBuffer, value: void) {},
  decode (buffer: DecodeBuffer): void {}
})

export type { EncodeBuffer, DecodeBuffer }

export const integers = [
  'u8', 'u16', 'u32', 'u64', 'u128',
  'i8', 'i16', 'i32', 'i64', 'i128',
  'f32', 'f64'
];

export type IntegerType = typeof integers[number];
export type BoolType = 'bool';
export type StringType = 'string';

export type OptionType = { option: Schema };
export type ArrayType = { array: { type: Schema, len?: number } };
export type EnumType = { enum: Array<StructType> };
export type SetType = { set: Schema };
export type MapType = { map: { key: Schema, value: Schema } };
export type StructType = { struct: { [key: string]: Schema } };
export type Schema =
  |IntegerType
  |BoolType
  |StringType
  |OptionType
  |ArrayType
  |EnumType
  |SetType
  |MapType
  |StructType;
