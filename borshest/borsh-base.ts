export type AnyField = {
  encode (buffer: Writer, value: unknown)
  decode (buffer: Reader): unknown
}

export type Field<T> = {
  encode (buffer: Writer, value: T)
  decode (buffer: Reader): T
}

/** The unit type (empty). */
export const unit: Field<void> = ({
  encode (buffer: Writer, value: void) {},
  decode (buffer: Reader): void {}
})

/** Contains the state of an encoding operation. */
export class Writer {
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
    const native = nativeSetter(type)
    if (native) {
      const [toCall, size] = native
      this.grow(size);
      this.view[toCall](this.offset, value, true);
      this.offset += size;
    } else {
      throw new Error(`writeNumber got invalid type hint: ${type}`)
    }
  }
}

/** Contains the state of a decoding operation. */
export class Reader {
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
    const start  = this.offset
    const end    = start + size
    const buffer = this.buffer.byteLength
    if (end > this.buffer.byteLength) {
      throw Object.assign(new Error('Error in schema, the buffer is smaller than expected'), {
        start,
        size,
        end,
        buffer,
        missing: end - this.buffer.byteLength
      })
    }
  }

  read (size: number): ArrayBuffer {
    this.assertEnough(size)
    const ret = this.buffer.slice(this.offset, this.offset + size)
    this.offset += size
    return ret
  }

  readNumber (type: NativeNumber): number|bigint {
    const native = nativeGetter(type)
    if (native) {
      const [toCall, size] = native
      this.assertEnough(size)
      const ret = this.view[toCall](this.offset, true);
      this.offset += size
      return ret
    } else {
      throw new Error(`readNumber got invalid type hint: ${type}`)
    }
  }
}

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

export const nativeInts = [1, 2, 4, 8]

export const nativeFloats = [4, 8]

type NativeNumber = keyof typeof nativeNumbers

const nativeGetter = (type: NativeNumber): [string, number]|null => {
  if (type in nativeNumbers) {
    const bSize = type.substring(1);
    return [nativeNumbers[type][0] as string, parseInt(bSize) / 8]
  }
  return null
}

const nativeSetter = (type: NativeNumber): [string, number]|null => {
  if (type in nativeNumbers) {
    const bSize = type.substring(1);
    return [nativeNumbers[type][1] as string, parseInt(bSize) / 8]
  }
  return null
}
