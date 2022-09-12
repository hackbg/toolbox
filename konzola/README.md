---
literate: typescript
---
# `@hackbg/konzola` [![NPM version](https://img.shields.io/npm/v/@hackbg/konzola?color=9013fe&label=)](https://www.npmjs.com/package/@hackbg/konzola)

Makes console output more readable.

## CJS/ESM support

This package includes 2 versions: 
* CJS version for Node
* ESM version for browsers (incl. ESM-only bundlers such as Vite)

```typescript
import * as KonzolaCJS from './konzola.cjs'
import * as KonzolaMJS from './konzola.browser.mjs'
import { ok, equal } from 'assert'
const testEach = x => [KonzolaCJS, KonzolaMJS].forEach(x)
```

## Console formatting

* The methods **log**, **info**, **warn**, **error** and **trace**
  are augmented with colored prefixes.
* The methods **debug** and **trace**
  pretty-print any objects that are passed to them.

* [ ] TODO: Use console.table (in CLI) and HTML formatting (in browser)
      to print error boxes

```typescript
testEach(({ CustomConsole })=>{

  const log = new CustomConsole('CustomConsole')

  log.log('hello\nworld')
  log.info('FYI\nindent')
  log.warn('beware\nof bugs!')
  log.error('oops\n:(')
  log.table([[123,456],[789,101112]])

  log.debugEnabled = true
  log.debug({pretty: 'printed'})
  log.trace({this: 'too'})

})
```

The console output is formatted as `$NAME $LEVEL $ARGS`, where `$NAME` is specified by the
constructor and is padded up to the length of the longest name of all `CustomConsole` instances.

```typescript
testEach(({ CustomConsole })=>{

  CustomConsole.indent = 0
  new CustomConsole('Foo')
  equal(CustomConsole.indent, 3)
  new CustomConsole('FooBar')
  equal(CustomConsole.indent, 6)
  new CustomConsole('Baz')
  equal(CustomConsole.indent, 6)

})
```

## Custom log events

By extending the `CustomConsole` class, you can define logging events.
This is meant as the first step towards converting a `console.log`-peppered codebase
to structured logging.

```typescript
testEach(({ CustomConsole })=>{

  class MyConsole extends CustomConsole {
    myEvent (...params) {
      console.info('My event:', ...params)
    }
  }

  const log = new MyConsole('MyCustomConsole')

  log.myEvent(1, 2, 3)

})
```

## Custom errors

By extending the `CustomError` class, you can easily define module-specific error classes.
This enables you to test for specific error conditions using the `instanceof` operator.
Names of defined errors are generated automatically, and you can pass a function that
generates the error message from the passed constructor parameters.

* [ ] TODO: Inherit from `EventEmitter`, allowing structured log data
      to be emitted from custom logging functions
* [ ] TODO: Third argument to `this.define`, returning an object containing the properties
      that will be assigned to the error instance at construction. This allows for custom data
      to be attached to error instances.

```typescript
testEach(({ CustomError })=>{

  class AppError extends CustomError {

    static InvalidInput = this.define('InvalidInput',
      (value) => `${value} (${typeof value}) is not valid input.`)

    static InvalidOutput = this.define('InvalidOutput')

  }

  const error1 = new AppError.InvalidInput('foo')
  ok(error1 instanceof Error)
  ok(error1 instanceof CustomError)
  ok(error1 instanceof AppError)
  ok(error1 instanceof AppError.InvalidInput)
  equal(error1.constructor, AppError.InvalidInput)
  equal(error1.constructor.name, 'InvalidInputAppError')
  equal(error1.name, 'InvalidInputAppError')
  equal(error1.message, 'foo (string) is not valid input.')

  const error2 = new AppError.InvalidOutput('ignored')
  ok(error2 instanceof Error)
  ok(error2 instanceof CustomError)
  ok(error2 instanceof AppError)
  ok(error2 instanceof AppError.InvalidOutput)
  equal(error2.constructor, AppError.InvalidOutput)
  equal(error2.constructor.name, 'InvalidOutputAppError')
  equal(error2.name, 'InvalidOutputAppError')
  equal(error2.message, '')

})
```

## Other helpers

This package also exports the **timestamp** function, which returns a filename-friendly
timestamp in the format `YYYYMMDD_HHMMSS`:

```typescript
import { equal } from 'assert'
testEach(({ timestamp }) => {
  equal(timestamp(new Date("2020-05-12T23:50:21.817Z")), '20200512_235021')
})
```

The packages `table`, `colors`, `propmts` and the non-broken version of `prettyjson`
are also reexported.
