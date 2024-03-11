import type { Field, EncodeBuffer, DecodeBuffer } from './borsh-base'
import { nativeIntBytes, nativeFloatBytes } from './borsh-base'

/** An unsigned integer. */
export const unsigned = (bytes: number): Field<bigint> => {
  if (nativeIntBytes.includes(bytes)) {
    const hint = `u${bytes*8}`
    return {
      encode (buffer: EncodeBuffer, value: bigint) {
        return buffer.writeNumber(value, this.hint)
      },
      decode (buffer: DecodeBuffer): bigint {
        return BigInt(buffer.readNumber(this.hint))
      },
    }
  } else {
    return {
      encode (buffer: EncodeBuffer, value: bigint) {
        const chunk = new Uint8Array(bytes);
        for (let i = 0; i < bytes; i++) {
          buffer[i] = Number(value & BigInt(0xff));
          value = value >> BigInt(8);
        }
        buffer.write(chunk)
      },
      decode (buffer: DecodeBuffer): bigint {
        const chunk = buffer.read(bytes)
        let number = 0n
        for (let i = bytes - 1; i >= 0; i--) {
          number = number * 256n + BigInt(chunk[i])
        }
        return number
      },
    }
  }
}

/** A signed integer. */
export const signed = (size: number): Field<bigint> & { hint?: string } => {
  if (nativeIntBytes.includes(size)) {
    const hint = `i${size*8}`
    return {
      encode (buffer: EncodeBuffer, value: bigint) {
        return buffer.writeNumber(value, this.hint)
      },
      decode (buffer: DecodeBuffer): bigint {
        return BigInt(buffer.readNumber(this.hint))
      },
    }
  } else {
    const sizes = nativeIntBytes.join('|')
    return {
      encode (buffer: EncodeBuffer, value: bigint) {
        throw new Error(`todo: encode signed of size other than ${sizes}`)
      },
      decode (buffer: DecodeBuffer): bigint {
        throw new Error(`todo: decode signed of size other than ${sizes}`)
      },
    }
  }
}

export const float = (size: number): Field<number> & { hint?: string } => {
  if (nativeFloatBytes.includes(size)) {
    const hint = `f${size*8}`
    return {
      encode (buffer: EncodeBuffer, value: number) {
        return buffer.writeNumber(value, this.hint)
      },
      decode (buffer: DecodeBuffer): number {
        return buffer.readNumber(this.hint) as number
      },
    }
  } else {
    const sizes = nativeFloatBytes.join('|')
    return {
      encode (buffer: EncodeBuffer, value: number) {
        throw new Error(`todo: encode float of size other than ${sizes}`)
      },
      decode (buffer: DecodeBuffer): number {
        throw new Error(`todo: decode float of size other than ${sizes}`)
      },
    }
  }
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

/** A 32-bit floating point number. */
export const f32 = () => float(4)
/** A 64-bit floating point number. */
export const f64 = () => float(16)

//function decode_integer(schema: IntegerType): number | bigint {
  //const size: number = parseInt(schema.substring(1));
  //if (size <= 32 || schema == 'f64') {
    //return this.buffer.consume_value(schema);
  //}
  //return this.decode_bigint(size, schema.startsWith('i'));
//}

//function decode_bigint(size: number, signed = false): bigint {
  //const buffer_len = size / 8;
  //const buffer = new Uint8Array(this.buffer.read(buffer_len));
  //const bits = buffer.reduceRight((r, x) => r + x.toString(16).padStart(2, '0'), '');
  //if (signed && buffer[buffer_len - 1]) {
    //return BigInt.asIntN(size, BigInt(`0x${bits}`));
  //}
  //return BigInt(`0x${bits}`);
//}

//function encode_integer(value: unknown, schema: IntegerType): void {
  //const size: number = parseInt(schema.substring(1));
  //if (size <= 32 || schema == 'f64') {
    //this.encoded.store_value(value as number, schema);
  //} else {
    //this.encode_bigint(BigInt(value as string), size);
  //}
//}

//function encode_bigint(value: bigint, size: number): void {
  //const buffer_len = size / 8;
  //const buffer = new Uint8Array(buffer_len);
  //for (let i = 0; i < buffer_len; i++) {
    //buffer[i] = Number(value & BigInt(0xff));
    //value = value >> BigInt(8);
  //}
  //this.encoded.write(new Uint8Array(buffer));
//}

//export function expectBigint (value: unknown, fieldPath: string[]): void {
  //const basicType = ['number', 'string', 'bigint', 'boolean'].includes(typeof(value));
  //const strObject = typeof (value) === 'object' && value !== null && 'toString' in value;
  //if (!basicType && !strObject) {
    //throw new Error(
      //`Expected bigint, number, boolean or string not ${typeof (value)}(${value}) at ${fieldPath.join('.')}`
    //)
  //}
//}
