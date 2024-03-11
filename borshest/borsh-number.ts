import type { Field, EncodeBuffer, DecodeBuffer } from './borsh-base'

/** An unsigned integer. */
export const unsigned = (size: number): Field<bigint> => ({
  encode (buffer: EncodeBuffer, value: bigint) {
    throw new Error('todo: encode unsigned')
  },
  decode (buffer: DecodeBuffer): bigint {
    const bytes = buffer.consume_bytes(size)
    throw new Error('todo: decode unsigned')
    return 0n
  }
})

function decode_integer(schema: IntegerType): number | bigint {
  const size: number = parseInt(schema.substring(1));
  if (size <= 32 || schema == 'f64') {
    return this.buffer.consume_value(schema);
  }
  return this.decode_bigint(size, schema.startsWith('i'));
}

function decode_bigint(size: number, signed = false): bigint {
  const buffer_len = size / 8;
  const buffer = new Uint8Array(this.buffer.consume_bytes(buffer_len));
  const bits = buffer.reduceRight((r, x) => r + x.toString(16).padStart(2, '0'), '');
  if (signed && buffer[buffer_len - 1]) {
    return BigInt.asIntN(size, BigInt(`0x${bits}`));
  }
  return BigInt(`0x${bits}`);
}

function encode_integer(value: unknown, schema: IntegerType): void {
  const size: number = parseInt(schema.substring(1));
  if (size <= 32 || schema == 'f64') {
    this.encoded.store_value(value as number, schema);
  } else {
    this.encode_bigint(BigInt(value as string), size);
  }
}

function encode_bigint(value: bigint, size: number): void {
  const buffer_len = size / 8;
  const buffer = new Uint8Array(buffer_len);
  for (let i = 0; i < buffer_len; i++) {
    buffer[i] = Number(value & BigInt(0xff));
    value = value >> BigInt(8);
  }
  this.encoded.store_bytes(new Uint8Array(buffer));
}

/** An 8-bit unsigned integer. */
export const u8   = unsigned(1)
/** A 16-bit unsigned integer. */
export const u16  = unsigned(2)
/** A 32-bit unsigned integer. */
export const u32  = unsigned(4)
/** A 64-bit unsigned integer. */
export const u64  = unsigned(8)
/** A 128-bit unsigned integer. */
export const u128 = unsigned(16)
/** A 256-bit unsigned integer. */
export const u256 = unsigned(32)

/** A signed integer. */
export const signed = (size: number): Field<bigint> => ({
  encode (buffer: EncodeBuffer, value: bigint) {
    throw new Error('todo: encode signed')
  },
  decode (buffer: DecodeBuffer): bigint {
    const bytes = buffer.consume_bytes(size)
    throw new Error('todo: decode signed')
    return 0n
  }
})

/** An 8-bit signed integer. */
export const i8   = signed(1)
/** A 16-bit signed integer. */
export const i16  = signed(2)
/** A 32-bit signed integer. */
export const i32  = signed(4)
/** A 64-bit signed integer. */
export const i64  = signed(8)
/** A 128-bit signed integer. */
export const i128 = signed(16)
/** A 256-bit signed integer. */
export const i256 = signed(32)

export const float = (size: number): Field<number> => ({
  encode (buffer: EncodeBuffer, value: number) {
    throw new Error('todo: encode float')
  },
  decode (buffer: DecodeBuffer): number {
    const bytes = buffer.consume_bytes(size)
    throw new Error('todo: decode float')
    return 0
  }
})

export const f32 = () => float(4)
export const f64 = () => float(16)

export function expectBigint (value: unknown, fieldPath: string[]): void {
  const basicType = ['number', 'string', 'bigint', 'boolean'].includes(typeof(value));
  const strObject = typeof (value) === 'object' && value !== null && 'toString' in value;
  if (!basicType && !strObject) {
    throw new Error(
      `Expected bigint, number, boolean or string not ${typeof (value)}(${value}) at ${fieldPath.join('.')}`
    )
  }
}
