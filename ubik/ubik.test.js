#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const example = resolve(dirname(fileURLToPath(import.meta.url)), 'example')

import ubik from './ubik.js'
await ubik(example, 'fix')
  .then(()=>import('./example/index.dist.js'))
  .catch(error=>console.error('Failed:', error))
  .finally(()=>ubik(example, 'clean'))

import assert from 'node:assert'
