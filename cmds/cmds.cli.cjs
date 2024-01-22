#!/usr/bin/env node

const { Console, bold } = require('@hackbg/logs/logs.cjs')
const console = new Console(`@hackbg/cmds ${require('./package.json').version}`)

let ganesha
try {
  ganesha = require.resolve('@hackbg/ganesha')
} catch (e) {
  console.warn(e)
  console.warn('Could not find @hackbg/ganesha. TypeScript not available.')
}

const { relative } = require('path')

const shortPathTo = abs => {
  const rel = relative(process.cwd(), abs)
  return (rel.startsWith('..')) ? abs : rel
}

const interpreter = process.argv[0]

const transpiler  = ganesha

const entrypoint  = process.argv[1]

const argv        = process.argv.slice(2)

if (process.env.VERBOSE) {
  console.info('  Interpreter:', shortPathTo(interpreter))
  if (transpiler) console.info('  Transpiler: ', shortPathTo(transpiler))
  console.info('  Entrypoint: ', shortPathTo(entrypoint))
  console.info('  Arguments:  ', argv)
  console.info()
  // Modification to process.env persists in child process
  process.env.NODE_OPTIONS = "--inspect"
  console.info('  Debug mode. Will run Node with --inspect.')
  if (ganesha) {
    process.env.GANESHA_NO_SOURCE_MAP = "1"
    console.info('  Runtime source maps disabled.')
  }
}

// FIXME run with just Node if missing Ganesha

require('@hackbg/ganesha').main([interpreter, transpiler, ...argv])
