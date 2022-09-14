#!/usr/bin/env node
let dotenv; try { dotenv = require('dotenv') } catch (e) {}
if (dotenv) dotenv.config()
let ganesha; try { ganesha = require.resolve('@hackbg/ganesha') } catch (e) {
  console.warn(e)
  console.warn('Could not find @hackbg/ganesha. TypeScript not available.')
}
const interpreter = process.argv[0]
const transpiler  = ganesha
const entrypoint  = process.argv[1]
const argv        = process.argv.slice(2)
console.info('  Interpreter:', interpreter)
console.info('  Transpiler: ', transpiler)
console.info('  Entrypoint: ', entrypoint)
console.info('  Arguments:  ', argv)
console.info()
require('@hackbg/ganesha').main([interpreter, transpiler, entrypoint, ...argv])
