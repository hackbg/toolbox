#!/usr/bin/env node

import ubik from './ubik.js'

import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'

ubik(
  process.cwd(),
  ...process.argv.slice(2)
).then(
  ()=>process.exit(0)
).catch(function ubikCliErrorHandler (error) {
  const { name, message, stack } = error
  const RE_FRAME = new RegExp("(file:///.+)(:\\d+:\\d+\\\))")
  const cwd   = process.cwd()
  const trim  = x => x.slice(3).replace(RE_FRAME, (y, a, b) => relative(cwd, fileURLToPath(a))+b)
  const frame = x => '  │' + trim(x)
  console.error(`${name}: ${message}\n${(stack||'').split('\n').slice(1).map(frame).join('\n')}`)
  process.exit(1)
})

