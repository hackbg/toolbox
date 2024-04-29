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
  object:      65536,
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
  const { before, after } = getAuthoredContent({ target, start, end })
  let generated = ''

  // Collect definitions that are in scope.
  const ids = collectIds(data, sources)

  // Generate documentation.
  recurseIntoModule(data)

  // Write output.
  if (!generated.endsWith('\n')) {
    generated += '\n'
  }
  writeFileSync(target, [
    before,
    start,
    generated,
    end,
    after
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
          generated += documentClass(child)
        }
      }
      if (child.children) {
        recurseIntoModule(child)
      }
    }
  }
}

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
export function documentClass (item) {
  let output = ''
  output += `\n\n# class *${item.name}*`
  if (item.comment?.summary) {
    output += '\n'
    for (const line of item.comment?.summary || []) {
      output += line.text
    }
    output += '\n'
  }

  const name = Case.camel(item.name)
  output += documentConstructors(item.children, name)
  output += documentProperties(item.children)
  output += documentMethods(item.children, name)

  return output
}

export function documentConstructors (items, name: string) {
  let output = ''
  for (const item of items) {
    if (item.name === 'constructor') {
      output += documentConstructor(item, name)
    }
  }
  return output
}

/** Generate Markdown documentation for `constructor` signatures of a `class` definition. */
export function documentConstructor (item, name: string) {
  let output = ''
  output += '\n```typescript\n'
  for (const signature of item.signatures) {
    if (signature.parameters?.length > 0) {
      output += `const ${name} = ${signature.name}(`
      for (const parameter of signature.parameters) {
        if (parameter.type?.typeArguments) {
          output += `\n  ${parameter.name}: ${parameter.type.name}<...>,`
        } else {
          output += `\n  ${parameter.name}: ${parameter.type.name}`
        }
      }
      output += `\n)`
    } else {
      output += `${signature.name}()`
    }
  }
  output += '\n```\n'
  return output
}

/** Generate Markkdown documentation for properties and accessors of a `class` definition. */
export function documentProperties (items) {
  let output = ''
  output += '\n<table><tbody>'
  for (const item of items) {
    if (
      ((item.kind === kinds.property) || (item.kind === kinds.accessor))
      && !(item.name === '[toStringTag]')
    ) {
      output += documentProperty(item)
    }
  }
  output += '</tbody></table>'
  return output
}

/** Generate Markdown documentation for a property or accessor. */
export function documentProperty (item) {
  let output = ''
  output += '\n<tr><td valign="top">'
  output += `\n<strong>${item.name}</strong>`
  output += '</td>\n<td>'
  if (item.type) {
    output += `<strong>${item.type.name}</strong>. `
  }
  for (const line of item.comment?.summary || []) {
    output += line.text
  }
  output += '</td></tr>'
  return output
}

/** Generate Markdown documentation for the methods of a `class` definition. */
export function documentMethods (items, name: string) {
  let output = ''
  for (const item of items) {
    if (item.kind === kinds.method && !(item.flags?.isProtected) && !(item.flags?.isPrivate)) {
      output += documentMethod(item, name)
    }
  }
  return output
}

/** Generate Markdown documentation for a method. */
export function documentMethod (item, name: string) {
  let output = ''
  const source = item.sources[0].url
  const isAbstract = item.flags?.isAbstract ? 'abstract ' : ''
  output += `\n\n## ${isAbstract}method [*${name}.${item.name}*](${source})`
  if (item.signatures) {
    for (const signature of item.signatures) {
      output += documentSignature(signature, item, name)
    }
  }
  return output
}

/** Generate Markdown documentation for a signature of a function or method. */
export function documentSignature (signature, item, name) {
  let output = ''
  //console.log('signature:', signature)
  if (signature.comment?.summary) {
    output += '\n'
    for (const line of signature.comment.summary) {
      output += line.text
    }
  }
  output += '\n<pre>\n'
  let returnType = signature.type
  let isAsync = false
  let isArray = false
  if (returnType) {
    if (returnType.type === 'reference' && returnType.name === 'Promise') {
      documentPromise()
    }
    if (returnType.type === 'array') {
      documentArray()
    }
    if (returnType.type === 'reference') {
      documentReference()
    } else if (returnType?.type === 'intrinsic') {
      documentIntrinsic()
    } else {
      console.warn('unhandled return type kind:', returnType.type)
    }
  }
  output += `${name}.${item.name}`
  output += documentParameters(signature)
  output += '\n</pre>'
  return output

  function documentPromise () {
    returnType = returnType.typeArguments[0]
    isAsync = true
  }

  function documentArray () {
    returnType = returnType.elementType
    isArray = true
  }

  function documentReference () {
    let typeName = returnType.name
    if ((returnType.typeArguments || []).length > 0) {
      typeName += '&lt;'
      typeName += returnType.typeArguments.map(t=>t.name).join(', ')
      typeName += '&gt;'
    }
    output += `<strong>const</strong> result: <em>`
    if (!returnType.refersToTypeParameter && !(returnType.package === 'typescript')) {
      output += `<a href="#">`
    }
    output += typeName
    if (!returnType.refersToTypeParameter && !(returnType.package === 'typescript')) {
      output += `</a>`
    }
    if (isArray) {
      output += `[]`
    }
    output += `</em> = `
    if (isAsync) {
      output += `<strong>await</strong> `
    }
  }

  function documentIntrinsic () {
    if (returnType.name !== 'this') {
      output += `<strong>const</strong> result: <em>${returnType.name}</em> = `
    }
    if (isAsync) {
      output += `<strong>await</strong> `
    }
  }
}

/** Generate Markdown documentation for the parameters of a function or method. */
export function documentParameters (signature) {
  let output = ''
  if (signature.parameters) {
    output += `(`
    for (const parameter of signature.parameters) {
      output += `\n  `
      if (parameter.flags?.isRest) {
        output += `...`
      }
      output += `${parameter.name}`
      if (parameter.type) {
        output += ': <em>'
        output += documentParameterType(parameter.type)
        output += '</em>'
      }
      output += `,`
    }
    output += `\n)`
  } else {
    output += '()'
  }
  return output
}

/** Generate Markdown documentation for a single parameter of a function or method. */
export function documentParameterType (argType) {
  let output = ''
  let isArray = false
  if (argType) {
    if (argType.type === 'array') {
      documentArray()
    }
    if (argType.type === 'reference') {
      documentReference()
    } else if (argType.type === 'intrinsic') {
      documentIntrinsic()
    } else if (argType.type === 'union') {
      documentUnion()
    } else if (argType.type === 'reflection') {
      documentReflection()
    } else {
      console.warn('unhandled argument type kind:', argType)
    }
  }
  return output

  function documentArray () {
    isArray = true
    argType = argType.elementType
  }

  function documentReference () {
    let typeName = argType.name
    if ((argType.typeArguments || []).length > 0) {
      typeName += '&lt;'
      typeName += argType.typeArguments.map(t=>t.name).join(', ')
      typeName += '&gt;'
    }
    output += typeName
    if (isArray) {
      output += '[]'
    }
  }

  function documentIntrinsic () {
    output += `${argType.name}`
  }

  function documentUnion () {
    output += argType.types.map(t=>documentParameterType(t)).join(' | ')
  }

  function documentReflection () {
    console.warn('unhandled reflection:', argType.declaration)
    output += argType.name || '???'
  }
}
