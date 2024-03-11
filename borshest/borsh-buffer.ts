import type { NumberType } from './borsh-number'

export class EncodeBuffer {
  offset:     number;
  bufferSize: number;
  buffer:     ArrayBuffer;
  view:       DataView;

  constructor () {
    this.offset = 0;
    this.bufferSize = 256;
    this.buffer = new ArrayBuffer(this.bufferSize);
    this.view = new DataView(this.buffer);
  }

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

  writeNumber (value: number, type: NumberType): void {
    const bSize = type.substring(1);
    const size = parseInt(bSize) / 8;
    this.grow(size);
    const toCall = type[0] === 'f'? `setFloat${bSize}`: type[0] === 'i'? `setInt${bSize}` : `setUint${bSize}`;
    this.view[toCall](this.offset, value, true);
    this.offset += size;
  }
}

export class DecodeBuffer {
  offset:     number;
  bufferSize: number;
  buffer:     ArrayBuffer;
  view:       DataView;

  constructor (buf: Uint8Array) {
    this.offset = 0;
    this.bufferSize = buf.length;
    this.buffer = new ArrayBuffer(buf.length);
    new Uint8Array(this.buffer).set(buf);
    this.view = new DataView(this.buffer);
  }

  assertEnough (size: number): void {
    if (this.offset + size > this.buffer.byteLength) {
      throw new Error('Error in schema, the buffer is smaller than expected');
    }
  }

  read (size: number): ArrayBuffer {
    this.assertEnough(size);
    const ret = this.buffer.slice(this.offset, this.offset + size);
    this.offset += size;
    return ret;
  }

  readNumber (type: NumberType): number {
    const bSize = type.substring(1);
    const size = parseInt(bSize) / 8;
    this.assertEnough(size);
    const toCall = type[0] === 'f'? `getFloat${bSize}`: type[0] === 'i'? `getInt${bSize}` : `getUint${bSize}`;
    const ret = this.view[toCall](this.offset, true);
    this.offset += size;
    return ret;
  }
}
