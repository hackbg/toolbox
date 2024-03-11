# The Borshest

Based on Borsh-JS and Borsher, but with fewer inversions of control,
Borshest allows you to decode Borsh and Zcash-encoded binary messages.

This was originally developed for querying data from the Namada API,
see `@fadroma/cw`.

## Example

## Available types

```javascript
import {
  unit,
  bool, option,
  unsigned, u8, u16, u32, u64, u128, u256,
  signed, i8, i16, i32, i64, i128, i256,
  float, f32, f64,
  array, vector, set, map,
  struct, variant,
} from '@hackbg/borshest'
```

## Differences

### 256-bit numbers

Borshest provides signed and unsigned integers up to 256-bit precision.

```javascript
const foo: bigint     = 12345678901234567890n
const bar: Uint8Array = u256.encode(foo)
const baz: bigint     = u256.decode(bar)
```

### Extensibility

Borshest does not use marker types or wrapper methods;
schema fields are represented by literal objects of the form:

```typescript
type Field<T> = {
  encode: (buffer: EncodeBuffer, value: T): void
  decode: (buffer: DecodeBuffer): T
}

const encoded = field.encode(object)
const decoded = field.decode(binary)
```

This means you can easily implement custom fields
if your implementation requires extending Borsh
(though we'd advise against that.)

Thanks to this extensible architecture, Borshest also provides support for Zcash encoding,
which is used alongside Borsh in the Namada API.

### Struct and enum schema

Borshest does not rely on key order for representations of structs and enums,
which is undefined according to JS spec. That's why they are represented as
arrays instead of objects:

```javascript
import { struct, variant, u8, u16, u32 string, unit } from '@hackbg/borshest'
const myStructSchema = struct(
  ['my-u8-field',            u8],
  ['my-string-field',        string],
  ['my-sub-struct-field',    struct(
    ['my-sub-field',         u16,
    ['my-sub-enum-field',    variant(
      ['enum-variant-1',     unit],
      ['enum-variant-2',     struct(
        ['variant-2-number', u32],
        ['variant-2-string', string]
      )],
      ['enum-variant-3',     struct(
        ['variant-3-number', u64],
        ['variant-3-string', string]
      )],
      /// ... you get the idea.
    )]
  )
)
const myStructValue = struct.decode(binary)
```

### No decorators

Borshest does not use decorators, which are not available in all contexts.
Instead, it provides classes of the following form:

```javascript
import { Struct } from '@hackbg/borshest'
class MyStruct extends Struct(
  ['my_field',       'string'],
  ['my_other_field', 'u128']
) {
  myMethod () { /***/ }
}
```

In TypeScript, to specify types, you must use the `declare` modifier
(otherwise the values will be overwritten with `undefined` during construction):

```typescript
import { Struct } from '@hackbg/borshest
class MyStruct extends Struct(
  ['myField',      'string'],
  ['myOtherField', 'u128']
) {
  declare myField:      string
  declare myOtherField: u128

  myMethod () { /***/ }
}
```

This does have the unfortunate side effect of having to write field names twice 🤷
On the other hand, it saves you from depending on the opaque transpilation machinery
that provides decorator support.
