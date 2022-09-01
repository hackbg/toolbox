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
```

## Console formatting

* The methods **log**, **info**, **warn**, **error** and **trace**
  are augmented with colored prefixes.
* The methods **debug** and **trace**
  pretty-print any objects that are passed to them.

```typescript
for (const { CustomConsole } of [KonzolaCJS, KonzolaMJS]) {

  const log = new CustomConsole(console, 'CustomConsole')

  log.log('hello\nworld')
  log.info('FYI\nindent')
  log.warn('beware\nof bugs!')
  log.error('oops\n:(')
  log.table([[123,456],[789,101112]])

  log.debugEnabled = true
  log.debug({pretty: 'printed'})
  log.trace({this: 'too'})

}
```

## Custom events

The `CustomConsole` class that can be extended to define logging events.

Reexports `table`, `colors`, `propmts` and the non-broken version of `prettyjson`

```typescript
for (const { CustomConsole } of [KonzolaCJS, KonzolaMJS]) {

  class MyConsole extends CustomConsole {
    myEvent (...params) {
      console.info('My event:', ...params)
    }
  }

  const log = new MyConsole(console, 'MyCustomConsole')

  log.myEvent(1, 2, 3)

}
```

## Other helpers

This package also exports the **timestamp** function, which returns a filename-friendly
timestamp in the format `YYYYMMDD_HHMMSS`:

```typescript
import { equal } from 'assert'
for (const { timestamp } of [KonzolaCJS, KonzolaMJS]) {
  equal(timestamp(new Date("2020-05-12T23:50:21.817Z")), '20200512_235021')
}
```

## Roadmap

* [ ] Use console.table (in CLI) and HTML formatting (in browser)
      to print error boxes
* [ ] Allow structured log data to be emitted from custom logging events
