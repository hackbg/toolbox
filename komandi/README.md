---
literate: typescript
---
# `@hackbg/komandi`

This is a simplified command parser with no built-in option parsing support.

Somewhere inbetween conversational and terminal interfaces: based on
structured invocations but without the unpronounceable parts.

## Defining commands

```typescript
#!/usr/bin/env komandi
// script.ts
import { Commands, parallel } from '@hackbg/komandi'
export default new Commands('run', [/*beforeEach*/], [/*afterEach*/])
  .command('cmd one', 'do one thing',  doOneThing)
  .command('cmd two', 'do two things', doOneThing, doAnotherThing)
  .command('cmd tri', 'do two things in parallel', parallel(doOneThing, doAnotherThing))
```

## Invoking commands

Commands are matched by string prefix:

```shell
$ npm exec my-script.ts         # lists all commands
$ npm exec my-script.ts cmd     # lists all commands that start with "cmd"
$ npm exec my-script.ts cmd one # runs command "cmd one"
$ npm exec my-script.ts cmd one two # pass args ["two"] to command "cmd one"
```

## Implementing commands

```typescript
// script.ts (continued)
// ...
// style tip: in single-file scripts, make use of function hoisting
// so the default export remains near the top of the module
function doOneThing (...args: string[]) {
  console.log(this) // In commands, `this` is bound to an instance of CommandContext
  return { flag: 1 }
}
async function doAnotherThing (...args: string[]) {
  console.log(this.flag) // Returning an object from the function updates the context
}
```
