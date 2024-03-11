import type { Field, EncodeBuffer, DecodeBuffer } from './borsh-base'

/** A boolean value. */
export const bool: Field<boolean> = ({

  encode (buffer: EncodeBuffer, value: boolean) {
    buffer.writeNumber(value as boolean ? 1 : 0, 'u8');
  },

  decode (buffer: DecodeBuffer): boolean {
    return buffer.readNumber('u8') > 0;
  }

})

/** Either a value or NULL. */
export const option = <T>(element: Field<T>) => ({

  encode (buffer: EncodeBuffer, value: T|null|undefined) {
    if (value === null || value === undefined) {
      buffer.writeNumber(0, 'u8')
      return
    }
    buffer.writeNumber(1, 'u8')
    element.encode(buffer, value)
  },

  decode (buffer: DecodeBuffer): T|null {
    const option = buffer.readNumber('u8')
    if (option === 1) {
      return element.decode(buffer)
    }
    if (option !== 0) {
      throw new Error(`Invalid option ${option}`)
    }
    return null
  }

})
