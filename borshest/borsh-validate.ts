export function expectType (value: unknown, type: string, fieldPath: string[]): void {
  if (typeof (value) !== type) {
    throw new Error(`Expected ${type} not ${typeof (value)}(${value}) at ${fieldPath.join('.')}`)
  }
}

export function expectSameSize (length: number, expected: number, fieldPath: string[]): void {
  if (length !== expected) {
    throw new Error(
      `Array length ${length} does not match schema length ${expected} at ${fieldPath.join('.')}`
    )
  }
}

// Validate Schema
const VALID_STRING_TYPES = integers.concat(['bool', 'string']);
const VALID_OBJECT_KEYS = ['option', 'enum', 'array', 'set', 'map', 'struct'];

export class ErrorSchema extends Error {
  constructor(schema: Schema, expected: string) {
    const message = `Invalid schema: ${JSON.stringify(schema)} expected ${expected}`;
    super(message);
  }
}

export function validateSchema(schema: Schema): void {
  if (typeof (schema) === 'string' && VALID_STRING_TYPES.includes(schema)) {
    return;
  }

  if (schema && typeof (schema) === 'object') {
    const keys = Object.keys(schema);

    if (keys.length === 1 && VALID_OBJECT_KEYS.includes(keys[0])) {
      const key = keys[0];

      if (key === 'option') return validateSchema(schema[key]);
      if (key === 'enum') return validateEnumSchema(schema[key]);
      if (key === 'array') return validateArraySchema(schema[key]);
      if (key === 'set') return validateSchema(schema[key]);
      if (key === 'map') return validateMapSchema(schema[key]);
      if (key === 'struct') return validateStructSchema(schema[key]);
    }
  }
  throw new ErrorSchema(schema, VALID_OBJECT_KEYS.join(', ') + ' or ' + VALID_STRING_TYPES.join(', '));
}

function validateEnumSchema (schema:  Array<StructType>): void {
  if (!Array.isArray(schema)) throw new ErrorSchema(schema, 'Array');

  for (const sch of schema) {
    if (typeof sch !== 'object' || !('struct' in sch)) {
      throw new Error('Missing "struct" key in enum schema');
    }

    if (typeof sch.struct !== 'object' || Object.keys(sch.struct).length !== 1) {
      throw new Error('The "struct" in each enum must have a single key');
    }

    validateSchema({struct: sch.struct});
  }
}

function validateArraySchema (schema: { type: Schema, len?: number }): void {
  if (typeof schema !== 'object') throw new ErrorSchema(schema, '{ type, len? }');

  if (schema.len && typeof schema.len !== 'number') {
    throw new Error(`Invalid schema: ${schema}`);
  }

  if ('type' in schema) return validateSchema(schema.type);

  throw new ErrorSchema(schema, '{ type, len? }');
}

function validateMapSchema (schema: { key: Schema, value: Schema }): void {
  if (typeof schema === 'object' && 'key' in schema && 'value' in schema) {
    validateSchema(schema.key);
    validateSchema(schema.value);
  } else {
    throw new ErrorSchema(schema, '{ key, value }');
  }
}

function validateStructSchema (schema: { [key: string]: Schema }): void {
  if (typeof schema !== 'object') {
    throw new ErrorSchema(schema, 'object');
  }

  for (const key in schema) {
    validateSchema(schema[key]);
  }
}
