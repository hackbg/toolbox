import type { Field, EncodeBuffer, DecodeBuffer } from './borsh-base'

/** A boolean value. */
export const bool: Field<boolean> = ({

  encode (buffer: EncodeBuffer, value: boolean) {
    buffer.store_value(value as boolean ? 1 : 0, 'u8');
  },

  decode (buffer: DecodeBuffer): boolean {
    return buffer.consume_value('u8') > 0;
  }

})

/** Either a value or NULL. */
export const option = <T>(element: Field<T>) => ({

  encode (buffer: EncodeBuffer, value: T|null|undefined) {
    if (value === null || value === undefined) {
      buffer.store_value(0, 'u8')
      return
    }
    buffer.store_value(1, 'u8')
    element.encode(buffer, value)
  },

  decode (buffer: DecodeBuffer): T|null {
    const option = buffer.consume_value('u8')
    if (option === 1) {
      return element.decode(buffer)
    }
    if (option !== 0) {
      throw new Error(`Invalid option ${option}`)
    }
    return null
  }

})
