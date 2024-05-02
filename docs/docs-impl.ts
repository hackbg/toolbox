import { Console } from '@hackbg/logs'
import Case from 'case'
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { DocumentationPage } from './docs'

const KIND = {
  MODULE:      4,
  CONSTANT:    32,
  FUNCTION:    64,
  CLASS:       128,
  INTERFACE:   256,
  CONSTRUCTOR: 512,
  PROPERTY:    1024,
  METHOD:      2048,
  LAMBDA:      4096,
  OBJECT:      65536,
  ACCESSOR:    262144,
  TYPE:        2097152,
}

export interface JSONDocs {
  children:    any[],
  symbolIdMap: Record<string, {
    sourceFileName: string,
    qualifiedName:  string
  }>
}

export interface PageSpec {
  sources: string[]
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

/** Generate Markdown documentation page by adding documentation generated from
  * `data` for specific `sources` into a `target` markdown file between the
  * `start` and `end` markers. */
export function documentModule ({
  log, data, sources, target
}: Partial<DocumentationPage> & { target: string }) {
  let generated = ''
  const items = collect({log, data, sources})
  log.debug('Collected', Object.keys(items).length, 'items')
  for (const item of Object.values(items)) {
    if (!Object.values(KIND).includes(item.kind)) {
      log.warn('Unknown kind', item.kind, item)
      continue
    }
    if (item.kind === KIND.CLASS) {
      generated += documentClass({ log, item })
    } else {
      log.warn('unhandled item:', item.name, item.kind)
    }
  }
  if (!generated.endsWith('\n')) generated += '\n'
  return generated
}

/** Collect item definitions that belong to specific sources. */
export function collect ({
  log, data, sources
}: Partial<DocumentationPage>) {
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
  const items: Record<number, { name: string, kind: number }> = {}
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

/** Generate Markdown documentation for a `class` definition. */
export function documentClass ({ log, item }: { log: Console, item: any }) {
  log.debug('class', item.name)

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

  // Document constructor(s) as code blocks
  for (const child of item.children) {
    if (child.name === 'constructor') {
      output += documentConstructor({ log, item: child, name })
    }
  }

  // Document properties and accessors as table
  output += '\n<table><tbody>'
  for (const child of item.children) {
    if (
      ((child.kind === KIND.PROPERTY) || (child.kind === KIND.ACCESSOR))
      && !(child.name === '[toStringTag]')
    ) {
      output += documentProperty({ log, item: child })
    }
  }
  output += '</tbody></table>'

  // Document methods as subsections
  for (const child of item.children) {
    if (
      child.kind === KIND.METHOD &&
      !(child.flags?.isProtected) && !(child.flags?.isPrivate)
    ) {
      output += documentMethod({ log, item: child, name, })
    }
  }

  return output
}

/** Generate Markdown documentation for `constructor` signatures of a `class` definition. */
export function documentConstructor ({ log, item, name }: {
  log:  Console
  item: any
  name: string
}) {
  log.debug('  constructor', item.name)
  let output = ''
  output += '\n<pre>\n'
  for (const signature of item.signatures) {
    output += `<strong>const</strong> ${name} = ${signature.name}`
    output += documentParameters(signature)
  }
  output += '\n</pre>\n'
  return output
}

/** Generate Markdown documentation for a property or accessor. */
export function documentProperty ({ log, item, name }: {
  log:  Console
  item: any
  name: string
}) {
  log.debug('  property', item.name)
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

/** Generate Markdown documentation for a method. */
export function documentMethod ({ log, item, name }: {
  log:  Console
  item: any
  name: string
}) {
  log.debug('  method', item.name)
  let output = ''
  let source = item.sources[0].url
  const isAbstract = item.flags?.isAbstract ? 'abstract ' : ''
  output += `\n\n## ${isAbstract}method [*${name}.${item.name}*](${source})`
  if (item.signatures) {
    for (const signature of item.signatures) {
      output += documentSignature({ log, signature, item, name })
    }
  }
  return output
}

/** Generate Markdown documentation for a signature of a function or method. */
export function documentSignature ({ log, signature, item, name }: {
  log: Console,
  signature
  item
  name
}) {
  let output = ''
  //log.log('signature:', signature)
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
      log.warn('unhandled return type kind:', returnType.type)
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
      if (parameter.name !== '__namedParameters') {
        output += `${parameter.name}`
        if (parameter.type) {
          output += ': '
        }
      }
      if (parameter.type) {
        output += '<em>'
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
export function documentParameterType ({ log, argType }: {
  log: Console
  argType: {
    name: string
    type: string
    elementType
    typeArguments
    types
    elements
    declaration
  }
}) {
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
    } else if (argType.type === 'intersection') {
      documentIntersection()
    } else if (argType.type === 'reflection') {
      documentReflection()
    } else if (argType.type === 'tuple') {
      documentTuple()
    } else {
      log.warn('unhandled argument type kind:', argType)
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

  function documentIntersection () {
    output += argType.types.map(t=>documentParameterType(t)).join(' & ')
  }

  function documentTuple () {
    output += '['
    output += argType.elements.map(t=>documentParameterType(t.element)).join(', ')
    output += ']'
  }

  function documentReflection () {
    if (
      (argType.declaration?.variant === 'declaration') &&
      !!argType.declaration.children
    ) {
      output += '{'
      output += argType.declaration.children.map(field=>`\n    ${field.name},`).join('')
      if (argType.declaration.children.length > 0) {
        output += '\n'
      }
      output += '  }'
    } else {
      log.warn('unhandled reflection:', argType.declaration.signatures)
      output += argType.name || '???'
    }
  }
}

