import type { Field, AnyField, EncodeBuffer, DecodeBuffer } from './borsh-base'

/** An enum variant which may have additional data attached. */
export const variant = <T>(...variants: [string, AnyField][]): Field<T> => {

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i]
    if (!(
      (variants[i] instanceof Array) &&
      (variants[i].length === 2) &&
      (typeof variants[i][0] === 'string') &&
      (!!variants[i][1]) &&
      (typeof variants[i][1] === 'object') &&
      (typeof variants[i][1].encode === 'function') &&
      (typeof variants[i][1].decode === 'function')
    )) {
      throw new Error(
        `struct fields #${i} must look like: ["name", { encode(), decode() }]`
      )
    }
  }

  return {

    encode (buffer: EncodeBuffer, value: T) {
      this.checkTypes && expectEnum(value, this.fieldPath);
      const valueKey = Object.keys(value)[0];
      for (let i = 0; i < schema.enum.length; i++) {
        const valueSchema = schema.enum[i] as StructType;
        if (valueKey === Object.keys(valueSchema.struct)[0]) {
          buffer.writeNumber(i, 'u8');
          return this.encode_struct(value, valueSchema as StructType);
        }
      }
      throw new Error(
        `Enum key (${valueKey}) not found in enum schema: ${JSON.stringify(schema)} at ${this.fieldPath.join('.')}`
      );
    },

    decode (buffer: DecodeBuffer): T {
      const valueIndex = this.buffer.consume_value('u8');
      if (valueIndex > schema.enum.length) {
        throw new Error(`Enum option ${valueIndex} is not available`);
      }
      const struct = schema.enum[valueIndex].struct;
      const key = Object.keys(struct)[0];
      return { [key]: this.decode_value(struct[key]) };
    }

  }

}

export function expectEnum (value: unknown, fieldPath: string[]): void {
  if (typeof (value) !== 'object' || value === null ) {
    throw new Error(
      `Expected object not ${typeof (value)}(${value}) at ${fieldPath.join('.')}`
    )
  }
}
