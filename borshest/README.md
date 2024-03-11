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

## API cheat sheet

```javascript
// Entry points:
import { decode, encode } from '@hackbg/borshest'

// Types:
import {
  unit,                                    // empty type
  bool, option,                            // boolean, optional
  unsigned, u8, u16, u32, u64, u128, u256, // unsigned integer
  signed, i8, i16, i32, i64, i128, i256,   // signed integer
  float, f32, f64,                         // floating point
  array, vector, set, map,                 // collections
  struct, variants,                         // structures (variant = enum)
} from '@hackbg/borshest'

// Helpers:
import {
  Struct,  // structs into class instances
  variant, // enum variant -> [name, data]
} from '@hackbg/borshest'

// Encoding and decoding:
const value:   bigint     = 12345678901234567890n
const encoded: Uint8Array = encode(u256, value)
const decoded: bigint     = decode(u256, encoded)

const schema = struct(
  ['field1',     u256],
  ['field2',     bool],
  ['field3',     variants(
    ['variant1', unit],
    ['variant2', string],
    ['variant3', struct(
      ['field1', array(20, u8)],
      ['field2', vector(string)],
      ['field3', type],
    )],
  )]
)

const value = { /*...*/ }

const encoded = encode(schema, value)

const decoded = decode(schema, encoded)
```

## Differences from prior art

### 256-bit numbers

Borshest provides signed and unsigned integers up to 256-bit precision.

### Extensibility

Instead of an intermediate schema representation;
all fields are represented by literal objects of the following form:

```typescript
type Field<T> = {
  encode: (buffer: EncodeBuffer, value: T): void
  decode: (buffer: DecodeBuffer): T
}
```

```typescript
const encoded = encode(field, object)
const decoded = decode(field, binary)
```

This means you can easily implement custom fields if your implementation requires extending Borsh
(though we'd advise against that.)

Thanks to this extensible architecture, Borshest also provides support for Zcash encoding,
which is used alongside Borsh in the Namada API.

### Struct and enum schema

Borsh expects consistent field order. The field order in JS objects is unspecified
Borshest does not rely on key order for representations of structs and enums,
which is undefined according to JS spec. That's why they are represented as
sequences of `[name, type]` pairs instead of the more customary `{name: type}` records.

```javascript
// Struct fields:
import { struct } from '@hackbg/borshest'
const schema = struct(
  ['field1', schema],
  ['field2', schema],
  ['field3', schema],
)

// Enum variants:
import { variants } from '@hackbg/borshest'
const schema = variants(
  ['variant1', schema],
  ['variant2', schema],
  ['variant3', schema],
)
```

### No decorators

Unlike [@dao-xyz/borsh](https://www.npmjs.com/package/@dao-xyz/borsh),
we do not use decorators, as they are an unstable feature.
Instead, you can define classes of the following form:

```javascript
import { Struct } from '@hackbg/borshest'
class MyStruct extends fromStruct(
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
class MyStruct extends fromStruct(
  ['myField',      string],
  ['myOtherField', u128]
) {
  declare myField:      string
  declare myOtherField: bigint

  myMethod () { /***/ }
}
```

This does have the unfortunate side effect of having to write field names twice 🤷
On the other hand, it saves you from depending on the opaque transpilation machinery
that provides decorator support, and hopefully speeds up your builds somewhat.
