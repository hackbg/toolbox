import type { Field, EncodeBuffer, DecodeBuffer } from './borsh-base'

export const string: Field<string> = {

  encode (buffer: EncodeBuffer, value: string) {
    const _value = value as string;
    // encode to utf8 bytes without using TextEncoder
    const utf8Bytes: number[] = [];
    for (let i = 0; i < _value.length; i++) {
      let charCode = _value.charCodeAt(i);
      if (charCode < 0x80) {
        utf8Bytes.push(charCode);
      } else if (charCode < 0x800) {
        utf8Bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
      } else if (charCode < 0xd800 || charCode >= 0xe000) {
        utf8Bytes.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
      } else {
        i++;
        charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (_value.charCodeAt(i) & 0x3ff));
        utf8Bytes.push(
          0xf0 | (charCode >> 18),
          0x80 | ((charCode >> 12) & 0x3f),
          0x80 | ((charCode >> 6) & 0x3f),
          0x80 | (charCode & 0x3f),
        );
      }
    }
    // 4 bytes for length + string bytes
    buffer.writeNumber(utf8Bytes.length, 'u32');
    buffer.write(new Uint8Array(utf8Bytes));
  },

  decode (buffer: DecodeBuffer): string {
    const len: number = buffer.readNumber('u32') as number;
    const buf = new Uint8Array(buffer.read(len));
    // decode utf-8 string without using TextDecoder
    // first get all bytes to single byte code points
    const codePoints = [];
    for (let i = 0; i < len; ++i) {
      const byte = buf[i];
      if (byte < 0x80) {
        codePoints.push(byte);
      } else if (byte < 0xE0) {
        codePoints.push(
          ((byte & 0x1F) << 6) | (buf[++i] & 0x3F)
        );
      } else if (byte < 0xF0) {
        codePoints.push(
          ((byte & 0x0F) << 12) | ((buf[++i] & 0x3F) << 6) | (buf[++i] & 0x3F)
        );
      } else {
        codePoints.push(
          ((byte & 0x07) << 18) | ((buf[++i] & 0x3F) << 12) | ((buf[++i] & 0x3F) << 6) | (buf[++i] & 0x3F)
        );
      }
    }
    // then decode code points to utf-8
    return String.fromCodePoint(...codePoints);
  }

}
