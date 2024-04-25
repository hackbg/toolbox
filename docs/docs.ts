import Case from 'case'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const kinds = {
  module:      4,
  constant:    32,
  class:       128,
  interface:   256,
  constructor: 512,
  property:    1024,
  method:      2048,
  getter:      262144,
  type:        2097152,
}

type JSONDocs = {
  symbolIdMap: Record<string, {
    sourceFileName: string,
    qualifiedName:  string
  }>
}

type Output = {
  before:    string,
  after:     string,
  generated: string,
  write (...args: string[])
}

/** Main entry point. Adds documentation generated from `data` for specific `sources`
  * into a `target` markdown file between the `start` and `end` markers. */
export function documentModule ({
  data,
  start = '<!-- @hackbg/docs: begin -->',
  end   = '<!-- @hackbg/docs: end -->',
  target,
  sources,
}: {
  target:  string,
  start?:  string,
  end?:    string,
  data:    JSONDocs,
  sources: string[]
}) {

  // Validate options
  if (!target) {
    throw new Error('Option "target" is unset: specify target file.')
  }
  if (!start) {
    throw new Error('Option "start" is empty: specify start marker or leave blank for default.')
  }
  if (!end) {
    throw new Error('Option "end" is empty: specify end marker or leave blank for default.')
  }
  if (!data) {
    throw new Error('Option "data" is empty: pass parsed output of "typedoc --json".')
  }

  // Validate options + collect definitions that are in scope.
  const ids = collectIds(data, sources)

  // The final output will be generated from the contents of this object.
  const output: Output = {
    before:    '',
    generated: '',
    after:     '',
    write (...args: string[]) {
      for (const arg of args) {
        this.generated += arg
      }
    }
  }

  // Load pre-existing data into output object.
  if (existsSync(target)) {
    const outputText = readFileSync(target, 'utf8')
    const splitBefore = outputText.split(start)
    if (splitBefore.length === 1) {
      throw new Error(`Start string not found in "${output}": ${start}`)
    }
    if (splitBefore.length > 2) {
      throw new Error(`Start string found more than once in "${output}": ${start}`)
    }
    output.before = splitBefore[0]
    const splitAfter = splitBefore[1].split(end)
    if (splitAfter.length === 1) {
      throw new Error(`End string not found in "${output}": ${end}`)
    }
    if (splitAfter.length > 2) {
      throw new Error(`End string found more than once in in "${output}": ${end}`)
    }
    output.after = splitAfter[1]
  }

  // Start generating documentation.
  recurseIntoModule(data)
  function recurseIntoModule (node) {
    for (const child of node.children) {
      if (ids.has(child.id)) {
        if (!Object.values(kinds).includes(child.kind)) {
          console.warn('Unknown kind', child.kind, child)
          continue
        }
        if (child.kind === kinds.class) {
          documentClass(output, child)
        }
      }
      if (child.children) {
        recurseIntoModule(child)
      }
    }
  }
}

/** Collect numeric IDs from JSON `data` that belong to specified `sources`. */
export function collectIds (data: JSONDocs, sources: string[]) {
  if (!data || !data.symbolIdMap || Object.keys(data.symbolIdMap).length === 0) {
    throw new Error('No data or empty data.symbolIdMap')
  }
  if (!sources || sources.length === 0) {
    throw new Error('No sources specified.')
  }
  const ids = new Set()
  for (const [symbol, { sourceFileName, qualifiedName }] of Object.entries(data.symbolIdMap)) {
    if (sources.includes(sourceFileName)) {
      ids.add(Number(symbol))
    }
  }
  return ids
}

/** Generate Markdown documentation for a `class` definition. */
export function documentClass (output: Output, child) {
  console.log(`\n\n# class *${child.name}*`)
  if (child.comment?.summary) {
    process.stdout.write('\n')
    for (const line of child.comment?.summary || []) {
      process.stdout.write(line.text)
    }
    process.stdout.write('\n')
  }

  for (const item of child.children) {
    if (item.name === 'constructor') {
      documentConstructor(output, item)
    }
  }

  process.stdout.write('\n<table><tbody>')

  for (const item of child.children) {
    if (item.name === '[toStringTag]') {
      continue
    }
    if (item.name === 'constructor') {
      continue
    }
    process.stdout.write('\n<tr><td valign="top">')
    if (item.signatures) {
      for (const signature of item.signatures) {
        if (signature.parameters) {
          process.stdout.write(`\n<br><strong>${item.name}(`)
          for (const parameter of signature.parameters) {
            process.stdout.write(`${parameter.name} `)
          }
          process.stdout.write(`)</strong>`)
        } else {
          process.stdout.write(`\n<strong>${item.name}()</strong>`)
        }
      }
    } else {
      process.stdout.write(`\n<strong>${item.name}</strong>`)
    }
    process.stdout.write('</td>\n<td>')
    if (item.type) {
      process.stdout.write(`<strong>${item.type.name}</strong>. `)
    }
    if (item.comment?.summary) {
      for (const line of item.comment?.summary || []) {
        process.stdout.write(line.text)
      }
    }
    process.stdout.write('</td></tr>')
  }
  process.stdout.write('</tbody></table>')
}

/** Generate Markdown documentation for `constructor` signatures of a `class` definition. */
export function documentConstructor (output: Output, item) {
  process.stdout.write('\n```typescript\n')
  for (const signature of item.signatures) {
    if (signature.parameters?.length > 0) {
      process.stdout.write(`let ${Case.camel(signature.name)} = ${signature.name}(`)
      for (const parameter of signature.parameters) {
        if (parameter.type?.typeArguments) {
          process.stdout.write(`\n  ${parameter.name}: ${parameter.type.name}<...>,`)
        } else {
          process.stdout.write(`\n  ${parameter.name}: ${parameter.type.name}`)
        }
      }
      process.stdout.write(`\n)`)
    } else {
      process.stdout.write(`${signature.name}()`)
    }
  }
  process.stdout.write('\n```\n')
}

/** Generate Markdown documentation for properties and accessors of a `class` definition. */
export function documentProperties (output: Output, item) {
}

/** Generate Mardown documentation for a property or accessor. */
export function documentProperty (output: Output, item) {
}

/** Generate Mardown documentation for a method. */
export function documentMethod (output: Output, item) {
}
