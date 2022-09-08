#!/usr/bin/env node
let dotenv; try { dotenv = require('dotenv') } catch (e) {}
if (dotenv) dotenv.config()
let ganesha; try { ganesha = require.resolve('@hackbg/ganesha') } catch (e) {
  console.warn(e)
  console.warn('Could not find @hackbg/ganesha. TypeScript not available.')
}
const entrypoint = process.argv[2]
const invocation = [process.argv[0], ganesha, entrypoint, ...process.argv.slice(3)]
require('@hackbg/ganesha').main(invocation)
