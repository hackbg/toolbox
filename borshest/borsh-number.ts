import type { Field, Writer, Reader } from './borsh-base'
import { nativeIntBytes, nativeFloatBytes } from './borsh-base'

/** An unsigned integer. */
export const unsigned = (bytes: number): Field<bigint> => {
  if (nativeIntBytes.includes(bytes)) {
    const typeHint = `u${bytes*8}`
    return {
      encode (buffer: Writer, value: bigint) {
        return buffer.writeNumber(value, typeHint)
      },
      decode (buffer: Reader): bigint {
        return BigInt(buffer.readNumber(typeHint))
      },
    }
  }

  return {
    encode (buffer: Writer, value: bigint) {
      const chunk = new Uint8Array(bytes);
      for (let i = 0; i < bytes; i++) {
        buffer[i] = Number(value & 0xFFn);
        value = value >> 8n;
      }
      buffer.write(chunk)
    },
    decode (buffer: Reader): bigint {
      const chunk = buffer.read(bytes)
      let number = 0n
      for (let i = bytes - 1; i >= 0; i--) {
        number = number << 8n
        number = number + BigInt(chunk[i])
      }
      return number
    },
  }
}

/** A signed integer. */
export const signed = (size: number): Field<bigint> => {
  if (nativeIntBytes.includes(size)) {
    const typeHint = `i${size*8}`
    return {
      encode (buffer: Writer, value: bigint) {
        return buffer.writeNumber(value, typeHint)
      },
      decode (buffer: Reader): bigint {
        return BigInt(buffer.readNumber(typeHint))
      },
    }
  }

  const sizes = nativeIntBytes.join('|')
  return {
    encode (buffer: Writer, value: bigint) {
      throw new Error(`todo: encode signed of size other than ${sizes}`)
    },
    decode (buffer: Reader): bigint {
      throw new Error(`todo: decode signed of size other than ${sizes}`)
    },
  }

}

export const float = (size: number): Field<number> => {
  if (nativeFloatBytes.includes(size)) {
    const typeHint = `f${size*8}`
    return {
      encode (buffer: Writer, value: number) {
        return buffer.writeNumber(value, typeHint)
      },
      decode (buffer: Reader): number {
        return buffer.readNumber(typeHint) as number
      },
    }
  }

  const sizes = nativeFloatBytes.join('|')
  return {
    encode (buffer: Writer, value: number) {
      throw new Error(`todo: encode float of size other than ${sizes}`)
    },
    decode (buffer: Reader): number {
      throw new Error(`todo: decode float of size other than ${sizes}`)
    },
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

/** A Zcash compact integer. */
export const compact: Field<bigint> = {

  encode (buffer: Writer, value: number|bigint) {
    throw new Error('encode CompactSize: not implemented')
  },

  decode (buffer: Reader): bigint {
    let flag = buffer.readNumber('u8')
    let result: bigint

    if (flag < 253n) {
      result = BigInt(flag)

    } else if (flag === 253n) {
      let pole = buffer.readNumber('u16')
      if (pole < 253n) {
        throw new Error('non-canonical CompactSize')
      }
      result = BigInt(pole)

    } else if (flag == 254n) {
      let pole = buffer.readNumber('u32')
      if (pole < 0x10000n) {
        throw new Error('non-canonical CompactSize')
      }
      result = BigInt(pole)

    } else {
      let pole = buffer.readNumber('u64')
      if (pole < 0x100000000n) {
        throw new Error('non-canonical CompactSize')
      }
      result = BigInt(pole)
    }

    if (result > 0x02000000n) {
      throw new Error('CompactSize too large')
    }

    return result
  }

}
