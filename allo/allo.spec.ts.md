```typescript
import * as assert from 'node:assert'
```

Let's define a regular class:

```typescript
class Something {
  property = 1
  method () { return ++this.property }
  get getter () { return ++this.property }
  set setter (v) { this.property += v }
  constructor (parameter) {
    this.property += parameter
  }
}

const something = new Something(1)
console.log(something)
assert.ok(something instanceof Something)
assert.equal(something.property, 2)
assert.equal(something.method(), 3)
assert.equal(something.getter, 4)
something.setter = 1
assert.equal(something.property, 5)
```

Now, let's use `defineCallable` to define a callable version of it as a subclass:

```typescript
import { defineCallable } from '.'

class CallableSomething extends defineCallable(Something, function (parameter) {
  return this
}) {
  anotherProperty = 1
  anotherMethod () { return ++this.anotherProperty }
  get anotherGetter () { return ++this.anotherProperty }
  set anotherSetter (v) { this.anotherProperty += v }
  constructor (parameter) {
    super(parameter)
    this.anotherProperty += parameter
  }
}

const callable = new CallableSomething(1)
console.log(callable)
assert.ok(callable instanceof CallableSomething)
assert.ok(callable instanceof Something)
assert.ok(callable() === callable)

assert.equal(callable.property, 2)
assert.equal(callable.anotherProperty, 2)
assert.equal(callable.method(), 3)
assert.equal(callable.anotherMethod(), 3)
assert.equal(callable.getter, 4)
assert.equal(callable.anotherGetter, 4)
callable.setter = 1
callable.anotherSetter = 1
assert.equal(callable.property, 5)
assert.equal(callable.anotherProperty, 5)
```
