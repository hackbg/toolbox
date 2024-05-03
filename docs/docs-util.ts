import { Console } from '@hackbg/logs'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { JSONDocs, Index } from './docs-impl'

export function getAuthoredContent ({ target, start, end, }: {
  target: string,
  start:  string,
  end:    string,
}): {
  before: string,
  after:  string
} {
  // Validate parameters
  if (!target) {
    throw new Error('Option "target" is unset: specify target file.')
  }
  if (!start) {
    throw new Error('Option "start" is empty: specify start marker or leave blank for default.')
  }
  if (!end) {
    throw new Error('Option "end" is empty: specify end marker or leave blank for default.')
  }
  let before = ''
  let after = ''
  // If `target` file is present, load pre-existing data into output object.
  if (existsSync(target)) {
    const outputText = readFileSync(target, 'utf8')
    const splitBefore = outputText.split(start)
    if (splitBefore.length === 1) {
      throw new Error(`Start string not found in "${target}": ${start}`)
    }
    if (splitBefore.length > 2) {
      throw new Error(`Start string found more than once in "${target}": ${start}`)
    }
    before = splitBefore[0]
    const splitAfter = splitBefore[1].split(end)
    if (splitAfter.length === 1) {
      throw new Error(`End string not found in "${target}": ${end}`)
    }
    if (splitAfter.length > 2) {
      throw new Error(`End string found more than once in in "${target}": ${end}`)
    }
    after = splitAfter[1] || ''
  }
  return { before, after }
}

/** Collect item definitions that belong to specific sources. */
export function collect ({ log, data, sources }: {
  log:      Console
  data:     JSONDocs
  sources?: string[]
}): Index {
  if (!data || !data.symbolIdMap || Object.keys(data.symbolIdMap).length === 0) {
    throw new Error('No data or empty data.symbolIdMap')
  }
  const ids = new Set()
  for (const [symbol, { sourceFileName, qualifiedName }] of Object.entries(data.symbolIdMap)) {
    if (
      !sources || (sources.length === 0) || sources.includes(sourceFileName)
    ) {
      ids.add(Number(symbol))
    }
  }
  const items: Index = {}
  ;(function descend (children) {
    for (const child of children) {
      if (ids.has(child.id)) {
        items[child.id] = child
      }
      if (child.children) {
        descend(child.children)
      }
    }
  })(data.children)
  return items
}

