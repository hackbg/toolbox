# `@hackbg/borshest` 🌲6️⃣

**Borsh** (Binary Object Representation Serializer for Hashing) is a
non-self-describing, binary serialization format....

> ... meant to be used in security-critical projects as it prioritizes consistency, safety, speed;
> and comes with a strict specification. (https://borsh.io/)[https://borsh.io/]

This library is based on [Borsh-JS (by Near, Dual Apache-2.0/MIT License)](https://github.com/near/borsh-js)
and [Borsher (by NameSky, MIT License)](https://github.com/nameskyteam/borsher).
See below for how we differ from those two.

## Quick start

```sh
npm i --save @hackbg/borshest
```

## All available types

```javascript
import {
  unit,                                    // empty
  bool, option,                            // boolean, optional
  unsigned, u8, u16, u32, u64, u128, u256, // unsigned integer
  signed, i8, i16, i32, i64, i128, i256,   // signed integer
  float, f32, f64,                         // floating point
  array, vector, set, map,                 // collections
  struct, variant,                         // structures (variant = enum)
} from '@hackbg/borshest'
```

## Differences from prior art

### 256-bit numbers

Borshest provides signed and unsigned integers up to 256-bit precision.

```javascript
import { u256, i256 } from '@hackbg/borshest'
const foo: bigint     = 12345678901234567890n
const bar: Uint8Array = u256.encode(foo)
const baz: bigint     = u256.decode(bar)
```

### Extensibility

We've scrapped the intermediate schema representation; all fields are represented by
literal objects of the following form:

```typescript
type Field<T> = {
  encode: (buffer: EncodeBuffer, value: T): void
  decode: (buffer: DecodeBuffer): T
}
```

```typescript
const encoded = field.encode(object)
const decoded = field.decode(binary)
```

This means you can easily implement custom fields if your implementation requires extending Borsh
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

Schema validation is performed upon calling `struct` or `variant`.

### No decorators

Unlike [@dao-xyz/borsh](https://www.npmjs.com/package/@dao-xyz/borsh),
we do not use decorators, as they are an unstable feature.
Instead, you can define classes of the following form:

```javascript
import { Struct } from '@hackbg/borshest'
class MyStruct extends Struct(
  ['my_field',       string],
  ['my_other_field', u128]
) {
  myMethod () { /***/ }
}
```

In TypeScript, to specify types, you must use the `declare` modifier
(otherwise the values will be overwritten with `undefined` during construction):

```typescript
import { Struct } from '@hackbg/borshest
class MyStruct extends Struct(
  ['myField',      string],
  ['myOtherField', u128]
) {
  declare myField:      string
  declare myOtherField: u128

  myMethod () { /***/ }
}
```

This does have the unfortunate side effect of having to write field names twice 🤷
On the other hand, it saves you from depending on the opaque transpilation machinery
that provides decorator support, and hopefully speeds up your builds somewhat.
