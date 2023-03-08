#!/usr/bin/env node

// If TS loading is already enabled
if (process.env.CMDS_TS) {
  // Instantiate the default export of the commands module
  console.info('TypeScript support enabled.\n')
  const entrypoint = require('path').resolve(process.cwd(), process.argv[2])
  import(entrypoint).then(module=>{
    const commands = new (module.default)()
    commands.run(process.argv.slice(3))
  })
} else {
  // Restart with Ganesha TypeScript loader
  console.info('Enabling TypeScript support...')
  if (process.env.CMDS_DEBUG) enableDebugMode()
  process.env.CMDS_TS = 1
  const argv = [process.argv[0], require.resolve('@hackbg/ganesha'), ...process.argv.slice(1)]
  require('@hackbg/ganesha').main(argv)
}

function enableDebugMode () {
  const interpreter = process.argv[0]
  const transpiler  = require.resolve('@hackbg/ganesha')
  const entrypoint  = process.argv[1]
  const argv        = process.argv.slice(2)
  Error.stackTraceLimit = Math.max(1000, Error.stackTraceLimit) // Never hurts
  console.info('  Interpreter:', shortPathTo(interpreter))
  if (transpiler) console.info('  Transpiler: ', shortPathTo(transpiler))
  console.info('  Entrypoint: ', shortPathTo(entrypoint))
  console.info('  Arguments:  ', argv)
  console.info()
  // Modification to process.env persists in child process
  process.env.NODE_OPTIONS = "--inspect"
  console.info('  Debug mode. Will run Node with --inspect.')
  if (ganesha) {
    process.env.Ganesha_NoSourceMap = "1"
    console.info('  Runtime source maps disabled.')
  }

  function shortPathTo (abs) {
    const rel = require('path').relative(process.cwd(), abs)
    return (rel.startsWith('..')) ? abs : rel
  }
}
