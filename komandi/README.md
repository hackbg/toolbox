---
literate: typescript
---
# `@hackbg/komandi`

Mini command parser.

Only takes literal position arguments.
No `-flags` and `--options`, structure your commands as sentences.

```typescript
import runCommands from '@hackbg/komandi'

const commands = {}

commands['simple-sync'] = (...args) => {
  console.log('hello', ...args)
}

commands['simple-async'] = async (...args) => {
  console.log('hello', ...args)
}

commands['nested'] = {
  sync (...args) {
    console.log('hello', ...args)
  },
  async ['async'] (...args) {
    console.log('hello', ...args)
  }
}

runCommands(
  commands,
  process.argv.slice(2),
  `Available commands:\n${Object.keys(commands).join('\n')}`
)
```

---

```typescript
const { ok, equal, deepEqual, throws } = assert
import { runOperation } from '.'
subSpec('commands', async function testCommands () {

  // run empty operation
  await runOperation("command", "usage",
    [], [])

  // can't run operation with invalid step
  await assert.rejects(runOperation("command", "usage",
    [undefined], []))

  // run operation with one step
  assert.ok(await runOperation("command", "usage",
    [()=>({foo:true})], []))

  // catch and rethrow step failure
  const error = {}
  assert.rejects(runOperation("command", "usage",
    [()=>{throw error}], []))

  // subsequent steps update the context
  result = await runOperation("command", "usage", [
    ()=>({foo:true}),
    ()=>({bar:true})], [])

  assert.ok(result.foo)
  assert.ok(result.bar)

  // the context.run function runs steps without updating context
  await assert.rejects(runOperation("command", "usage",
    [ async (context) => { await context.run() } ], []))
  assert.ok(await runOperation("command", "usage",
    [ async (context) => { await context.run(async () => {}) } ], []))
})
```
