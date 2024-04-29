import Case from 'case'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const kinds = {
  module:      4,
  constant:    32,
  function:    64,
  class:       128,
  interface:   256,
  constructor: 512,
  property:    1024,
  method:      2048,
  accessor:    262144,
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
  append (...args: string[])
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

  // Make sure we have the JSON output of Typedoc.
  // TODO: Automatically invoke typedoc to generate this.
  if (!data) {
    throw new Error('Option "data" is empty: pass parsed output of "typedoc --json".')
  }

  // Construct output object
  const output = createOutput({ target, start, end })

  // Collect definitions that are in scope.
  const ids = collectIds(data, sources)

  // Generate documentation.
  recurseIntoModule(data)

  // Write output.
  if (!output.generated.endsWith('\n')) {
    output.generated += '\n'
  }
  writeFileSync(target, [
    output.before,
    start,
    output.generated,
    end,
    output.after
  ].join(''), 'utf8')

  console.log(`Generated ${target}.`)

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

export function createOutput ({ target, start, end, }: {
  target:  string,
  start:   string,
  end:     string,
}) {
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
  // Create empty output object
  const output: Output = {
    before:    '',
    generated: '',
    after:     '',
    append (...args: string[]) {
      for (const arg of args) {
        this.generated += arg
      }
    }
  }
  // If `target` file is present, load pre-existing data into output object.
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
    output.after = splitAfter[1] || ''
  }
  return output
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
export function documentClass (output: Output, item) {
  output.append(`\n\n# class *${item.name}*`)
  if (item.comment?.summary) {
    output.append('\n')
    for (const line of item.comment?.summary || []) {
      output.append(line.text)
    }
    output.append('\n')
  }

  const name = Case.camel(item.name)
  documentConstructors(output, item.children, name)
  documentProperties(output, item.children)
  documentMethods(output, item.children, name)
}

export function documentConstructors (output: Output, items, name: string) {
  for (const item of items) {
    if (item.name === 'constructor') {
      documentConstructor(output, item, name)
    }
  }
}

/** Generate Markdown documentation for `constructor` signatures of a `class` definition. */
export function documentConstructor (output: Output, item, name: string) {
  output.append('\n```typescript\n')
  for (const signature of item.signatures) {
    if (signature.parameters?.length > 0) {
      output.append(`const ${name} = ${signature.name}(`)
      for (const parameter of signature.parameters) {
        if (parameter.type?.typeArguments) {
          output.append(`\n  ${parameter.name}: ${parameter.type.name}<...>,`)
        } else {
          output.append(`\n  ${parameter.name}: ${parameter.type.name}`)
        }
      }
      output.append(`\n)`)
    } else {
      output.append(`${signature.name}()`)
    }
  }
  output.append('\n```\n')
}

/** Generate Markkdown documentation for properties and accessors of a `class` definition. */
export function documentProperties (output: Output, items) {
  output.append('\n<table><tbody>')
  for (const item of items) {
    if (
      ((item.kind === kinds.property) || (item.kind === kinds.accessor))
      && !(item.name === '[toStringTag]')
    ) {
      documentProperty(output, item)
    }
  }
  output.append('</tbody></table>')
}

/** Generate Markdown documentation for a property or accessor. */
export function documentProperty (output: Output, item) {
  output.append('\n<tr><td valign="top">')
  output.append(`\n<strong>${item.name}</strong>`)
  output.append('</td>\n<td>')
  if (item.type) {
    output.append(`<strong>${item.type.name}</strong>. `)
  }
  for (const line of item.comment?.summary || []) {
    output.append(line.text)
  }
  output.append('</td></tr>')
}

/** Generate Markdown documentation for the methods of a `class` definition. */
export function documentMethods (output: Output, items, name: string) {
  for (const item of items) {
    if (item.kind === kinds.method && !(item.flags?.isProtected) && !(item.flags?.isPrivate)) {
      documentMethod(output, item, name)
    }
  }
}

/** Generate Markdown documentation for a method. */
export function documentMethod (output: Output, item, name: string) {
  const source = item.sources[0].url
  const isAbstract = item.flags?.isAbstract ? 'abstract ' : ''
  output.append(`\n\n## ${isAbstract}method [*${name}.${item.name}*](${source})`)
  if (item.signatures) {
    for (const signature of item.signatures) {
      documentSignature(output, signature, item, name)
    }
  }
}

export function documentSignature (output: Output, signature, item, name) {
  //console.log('signature:', signature)
  if (signature.comment?.summary) {
    output.append('\n')
    for (const line of signature.comment.summary) {
      output.append(line.text)
    }
  }

  output.append('\n<pre>\n')

  let returnType = signature.type
  let isAsync = false
  if (returnType) {
    if (returnType.type === 'reference' && returnType.name === 'Promise') {
      returnType = returnType.typeArguments[0]
      isAsync = true
    }
    if (returnType.type === 'reference') {
      let typeName = returnType.name
      //console.log(returnType)
      if ((returnType.typeArguments || []).length > 0) {
        typeName += '&lt;'
        typeName += returnType.typeArguments.map(t=>t.name).join(', ')
        typeName += '&gt;'
      }
      output.append(`<strong>const</strong> result: <em>`)
      if (!returnType.refersToTypeParameter && !(returnType.package === 'typescript')) {
        output.append(`<a href="#">`)
      }
      output.append(typeName)
      if (!returnType.refersToTypeParameter && !(returnType.package === 'typescript')) {
        output.append(`</a>`)
      }
      output.append(`</em> = `)
      if (isAsync) {
        output.append(`<strong>await</strong> `)
      }
    } else if (returnType?.type === 'intrinsic') {
      if (returnType.name !== 'this') {
        output.append(`<strong>const</strong> result: <em>${returnType.name}</em> = `)
      }
    } else {
      console.warn('unhandled return type kind:', returnType.type)
    }
  }
  output.append(`${name}.${item.name}`)
  documentParameters(output, signature)

  output.append('\n</pre>')
}

export function documentParameters (output: Output, signature) {
  if (signature.parameters) {
    output.append(`(`)
    for (const parameter of signature.parameters) {
      output.append(`\n  `)
      if (parameter.flags?.isRest) {
        output.append(`...`)
      }
      output.append(`${parameter.name}`)
      let argType = parameter.type
      let isArray = false
      if (argType) {
        if (argType.type === 'array') {
          isArray = true
          argType = argType.elementType
        }
        if (argType.type === 'reference') {
          output.append(`: <em>`)
          let typeName = argType.name
          if ((argType.typeArguments || []).length > 0) {
            typeName += '&lt;'
            typeName += argType.typeArguments.map(t=>t.name).join(', ')
            typeName += '&gt;'
          }
          output.append(typeName)
          if (isArray) {
            output.append('[]')
          }
          output.append('</em>')
        } else if (argType.type === 'intrinsic') {
          output.append(`: <em>${argType.name}</em>`)
        } else {
          console.warn('unhandler argument type kind:', argType.type)
        }
      }
      output.append(`,`)
    }
    output.append(`\n)`)
  } else {
    output.append('()')
  }
}
