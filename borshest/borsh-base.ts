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

/** Types for which there is a native DataView method. */
const nativeNumbers: Record<string, [keyof DataView, keyof DataView]> = {
  'u8':   [ 'getUint8',      'setUint8'     ],
  'u16':  [ 'getUint16',     'setUint16'    ],
  'u32':  [ 'getUint32',     'setUint32'    ],
  'u64':  [ 'getBigUint64',  'setBigUint64' ],

  'i8':   [ 'getInt8',       'setInt8'      ],
  'i16':  [ 'getInt16',      'setInt16',    ],
  'i32':  [ 'getInt32',      'setInt32'     ],
  'i64':  [ 'getBigInt64',   'setBigInt64'  ],

  'f32':  [ 'getFloat32',    'setFloat32'   ],
  'f64':  [ 'getFloat64',    'setFloat64'   ],
}

export const nativeIntBytes = [1, 2, 4, 8]

export const nativeFloatBytes = [4, 8]

type NativeNumber = keyof typeof nativeNumbers

const getNativeGetter = (type: NativeNumber): [string, number]|null => {
  if (type in nativeNumbers) {
    const bSize = type.substring(1);
    return [nativeNumbers[type][0] as string, parseInt(bSize) / 8]
  }
  return null
}

const getNativeSetter = (type: NativeNumber): [string, number]|null => {
  if (type in nativeNumbers) {
    const bSize = type.substring(1);
    return [nativeNumbers[type][1] as string, parseInt(bSize) / 8]
  }
  return null
}

export class EncodeBuffer {
  offset:     number      = 0
  bufferSize: number      = 256
  buffer:     ArrayBuffer = new ArrayBuffer(this.bufferSize)
  view:       DataView    = new DataView(this.buffer)

  grow (needed_space: number): void {
    if (this.bufferSize - this.offset < needed_space) {
      this.bufferSize = Math.max(this.bufferSize * 2, this.bufferSize + needed_space);
      const new_buffer = new ArrayBuffer(this.bufferSize);
      new Uint8Array(new_buffer).set(new Uint8Array(this.buffer));
      this.buffer = new_buffer;
      this.view = new DataView(new_buffer);
    }
  }

  getUsed (): Uint8Array {
    return new Uint8Array(this.buffer).slice(0, this.offset);
  }

  write (from: Uint8Array): void {
    this.grow(from.length);
    new Uint8Array(this.buffer).set(new Uint8Array(from), this.offset);
    this.offset += from.length;
  }

  writeNumber (value: number|bigint, type: NativeNumber): void {
    const native = getNativeSetter(type)
    if (native) {
      const [toCall, size] = native
      this.grow(size);
      this.view[toCall](this.offset, value, true);
      this.offset += size;
    } else {
      throw new Error(`Passed invalid type hint: ${type}`)
    }
  }
}

export class DecodeBuffer {
  offset:     number = 0
  bufferSize: number
  buffer:     ArrayBuffer
  view:       DataView

  constructor (buf: Uint8Array) {
    this.bufferSize = buf.length
    this.buffer     = new ArrayBuffer(buf.length)
    new Uint8Array(this.buffer).set(buf)
    this.view       = new DataView(this.buffer)
  }

  assertEnough (size: number): void {
    if (this.offset + size > this.buffer.byteLength) {
      throw new Error('Error in schema, the buffer is smaller than expected');
    }
  }

  read (size: number): ArrayBuffer {
    this.assertEnough(size)
    const ret = this.buffer.slice(this.offset, this.offset + size)
    this.offset += size
    return ret
  }

  readNumber (type: NativeNumber): number|bigint {
    const native = getNativeGetter(type)
    if (native) {
      const [toCall, size] = native
      this.assertEnough(size)
      const ret = this.view[toCall](this.offset, true);
      this.offset += size
      return ret
    } else {
      throw new Error(`Passed invalid type hint: ${type}`)
    }
  }
}
