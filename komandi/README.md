---
literate: typescript
---
# `@hackbg/komandi`

This is a simplified command parser with no built-in option parsing support.

Somewhere inbetween conversational and terminal interfaces: based on
structured invocations but without the unpronounceable parts.

## Defining commands

```typescript
// script.ts
import { CommandContext, parallel } from '@hackbg/komandi'

export default new CommandContext('run', [/*beforeEach*/], [/*afterEach*/])
  .addCommand('cmd one', 'do one thing',  doOneThing)
  .addCommand('cmd two', 'do two things', doOneThing, doAnotherThing)
  .addCommand('cmd tri', 'do two things in parallel', parallel(doOneThing, doAnotherThing))
  .addCommands('cmd sub', 'subcommands', new CommandContext('sub')
    .addCommand('four', 'one subcommand', () => { /* ... */ })
    .addCommand('five', 'another subcommand', async () => { /*...*/ }))
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

`this` is bound to an instance of CommandContext which has the following properties:
`timestamp`, `env`, `cwd`, `commands`, `command`, `args`, `log`. You can add your own
utilities to that list by inheriting from a custom base class that `extends CommandContext`.

## Invoking commands

Commands are matched by string prefix:

```shell
/*
$ npm exec my-script.ts             # lists all commands
$ npm exec my-script.ts cmd         # lists all commands that start with "cmd"
$ npm exec my-script.ts cmd one     # runs command "cmd one"
$ npm exec my-script.ts cmd one two # pass args ["two"] to command "cmd one"
$ npm exec my-script.ts cmd sub four
$ npm exec my-script.ts cmd sub five arg1
*/
```

## Lazy promises

A normal JavaScript promise is only evaluated once, as soon as it's constructed.
The "lazy promise" provided by the `Lazy` class in this library also acts as a one-shots;
however, evaluation only takes place when someone calls `then`
(either directly or by using `await`).

```typescript
import { Lazy } from '@hackbg/komandi'
import { equal } from 'assert'
let promiseCalled = false
const p = new Promise(ok=>{ promiseCalled = true; ok() })
equal(promiseCalled, true)
await p
equal(promiseCalled, true)

let lazyCalled = false
const l = new Lazy(()=>{ lazyCalled = true })
equal(lazyCalled, false)
await l
equal(lazyCalled, true)
```

Lazy promises are useful for expressing asynchronous, immutable dependencies.

This way you can define `await`-able computations in advance,
but, unlike promises, they will not be run unless something actually
depends on their result.

This makes them ideal building blocks for composable, multi-stage operations,
such as a build graph:

```typescript
import { deepEqual } from 'assert'

const uploaded = new Set()
const l1 = new Lazy(()=>{ uploaded.add(1); return 1 })
const l2 = new Lazy(()=>{ uploaded.add(2); return 2 })
const l3 = new Lazy(async ()=>{
  const [r1, r2] = await Promise.all([l1, l2])
  uploaded.add(r1 + r2)
  return r1 + r2
})

deepEqual([...uploaded], [],
  'initial state')
equal(await l1, 1,
  'resolved value of l1')
deepEqual([...uploaded], [1],
  'state changed')
equal(await l3, 3,
  'resolved value of l3')
deepEqual([...uploaded], [1, 2, 3],
  'l2 was also evaluated')
```

## Deferred

```typescript
import { Deferred } from '@hackbg/komandi'
const d = new Deferred()
d.then(val=>`deferred ${val}`)
d.resolve(1)
```

## Task

```typescript
import { Task } from '@hackbg/komandi'
equal(new Task(function myTask () {}).name, 'myTask')
equal(new Task('named task', function myTask () {}).name, 'named task')
const task = new Task(()=>{})
equal(task.called, false)
await task
equal(task.called, true)

class Tasks extends CommandContext {
  task1 = this.task('task 1', () => { return 1 })
  task2 = this.task('task 2', async () => { return await this.task1 + 1 })
}
const tasks = new Tasks()
equal(tasks.task1.called, false)
equal(tasks.task2.called, false)
await tasks.task2
equal(tasks.task1.called, true)
equal(tasks.task2.called, true)
```
