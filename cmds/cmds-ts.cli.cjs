#!/usr/bin/env node

const { Console, bold } = require('@hackbg/logs/logs.cjs')
const console = new Console(`@hackbg/cmds ${require('./package.json').version}`)

const { resolve, relative } = require('path')

const shortPathTo = abs => {
  const rel = relative(process.cwd(), abs)
  return (rel.startsWith('..')) ? abs : rel
}

// Check if ganesha (ts loader) is available
let ganesha
try {
  ganesha = require.resolve('@hackbg/ganesha')
} catch (e) {
  console.warn('@hackbg/ganesha not installed - scripting in TypeScript not available.')
}

if (ganesha && !process.env.CMDS_TS) {
  const { version: ganeshaVersion } = require('@hackbg/ganesha/package.json')
  // If ganesha is available and not enabled restart through ganesha
  //console.info(`TS JIT by`, bold(`@hackbg/ganesha ${ganeshaVersion}`))
  if (process.env.VERBOSE) {
    const interpreter = process.argv[0]
    const transpiler  = require.resolve('@hackbg/ganesha')
    const entrypoint  = process.argv[1]
    const argv        = process.argv.slice(2)
    console.info('  Interpreter:', bold(shortPathTo(interpreter)))
    if (transpiler) {
      console.info('  Transpiler: ', bold(shortPathTo(transpiler)))
    }
    console.info('  Entrypoint: ', bold(shortPathTo(entrypoint)))
    console.info('  Arguments:  ', argv)
  }
  if (process.env.CMDS_DEBUG) {
    enableDebugMode()
  }
  if (ganesha) {
    process.env.CMDS_TS = 1
    const argv = [process.argv[0], ganesha, ...process.argv.slice(1)]
    require('@hackbg/ganesha').main(argv)
  }
} else {
  // Run the default export of the commands module
  if (process.env.CMDS_TS) {
    console.warn('TS JIT on. This may be slow on large codebases.')
  }
  const entrypoint = resolve(process.cwd(), process.argv[2])
  import(entrypoint).then(module=>{
    let commands
    try {
      commands = new (module.default)()
    } catch (e) {
      console.error('Failed to instantiate command module:', bold(entrypoint))
      console.error(e)
      commandModuleUsage()
      process.exit(1)
    }
    if (commands.run instanceof Function) {
      commands.run(process.argv.slice(3))
    } else {
      console.error('Invalid command module:', bold(entrypoint))
      commandModuleUsage()
      process.exit(1)
    }
  })
}

function commandModuleUsage (entrypoint) {
  console.error('A valid command module:')
  console.error('  - Must be a valid ECMAScript module;')
  console.error('  - Must "export default" a class, which')
  console.error('    extends CommandContext, or otherwise')
  console.error('    has a run(...argv) method.')
  process.exit(1)
}

function enableDebugMode () {
  Error.stackTraceLimit = Math.max(1000, Error.stackTraceLimit) // Never hurts
  // Modification to process.env persists in child process
  process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS} --inspect`
  console.info('  Debug mode. Will run Node with --inspect.')
  if (ganesha) {
    process.env.Ganesha_NoSourceMap = "1"
    console.info('  Runtime source maps disabled.')
  }
}
