import { Console } from '@hackbg/logs'
import Case from 'case'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { DocumentationPage } from './docs'
import { collect } from './docs-util'

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
  ARGUMENT:    32768,
  OBJECT:      65536,
  ACCESSOR:    262144,
  TYPE:        2097152,
}

const RE_PARENS = /^\((.+)\)$/s

export interface JSONDocs {
  children:    any[],
  symbolIdMap: Record<string, {
    sourceFileName: string,
    qualifiedName:  string
  }>
}

export interface Item {
  name: string,
  kind: number,
  [k: string]: unknown
}

export type Index = Record<number, Item>

export interface PageSpec {
  sources: string[]
}

export interface Signature {
  parameters: Array<Parameter>
}

export interface Parameter {
  name: string
  flags?: { isRest?: boolean }
  type: {
    name: string
    type: string
    elementType
    typeArguments
    types
    elements
    declaration
  }
}

/** Generate Markdown documentation page by adding documentation generated from
  * `data` for specific `sources` into a `target` markdown file between the
  * `start` and `end` markers. */
export function documentModule ({
  log, data, index, sources, target
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
      generated += documentClass({ log, index, item })
    } else if (
      (item.kind === KIND.CONSTRUCTOR) ||
      (item.kind === KIND.PROPERTY) ||
      (item.kind === KIND.ACCESSOR) ||
      (item.kind === KIND.METHOD)
    ) {
    } else {
      log.warn('unhandled item:', item.name, item.kind)
    }
  }
  if (!generated.endsWith('\n')) generated += '\n'
  return generated
}

/** Generate Markdown documentation for a `class` definition. */
export function documentClass ({ log, index, item }: {
  log:   Console,
  index: Index,
  item:  any
}) {
  log.debug('class', item.name)

  let output = ''

  output += `\n\n# `
  if (item.flags?.isAbstract) {
    output += `abstract `
  }
  output += `class *${item.name}*`

  if (item.comment?.summary) {
    output += '\n'
    for (const line of item.comment?.summary || []) {
      output += line.text
    }
    output += '\n'
  }

  const name = Case.camel(item.name)

  // Document constructor(s) as code blocks
  if (!(item.flags?.isAbstract)) {
    for (const child of item.children) {
      if (child.name === 'constructor') {
        output += documentConstructor({
          log,
          index,
          cls: item,
          ctor: child,
          name
        })
      }
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
      output += documentMethod({ log, index, item: child, name, })
    }
  }

  return output
}

/** Generate Markdown documentation for `constructor` signatures of a `class` definition. */
export function documentConstructor ({ log, index, cls, ctor, name }: {
  log:   Console
  index: Index,
  cls:   any
  ctor:  any
  name:  string
}) {
  log.debug('  constructor', ctor.name)
  let output = ''
  output += '\n<pre>\n'
  for (const signature of ctor.signatures) {
    output += `<strong>const</strong> ${name} = ${signature.name}`
    if (signature.parameters?.length === 1) {
      const [parameter] = signature.parameters
      if (
        (parameter.type.name === 'Partial') &&
        (parameter.type.package === 'typescript') &&
        (parameter.type.typeArguments[0].target === cls.id)
      ) {
        output += '({'
        let needsNewline = false
        for (const child of cls.children) {
          if (
            (child.kind === KIND.PROPERTY) &&
            (child.name[0] !== '[')
          ) {
            output += `\n  ${child.name},`
            needsNewline = true
          }
        }
        if (needsNewline) {
          output += '\n'
        }
        output += '})'
        continue
      }
    }
    output += documentParameters({ log, index, signature })
  }
  output += '\n</pre>\n'
  return output
}

/** Generate Markdown documentation for a property or accessor. */
export function documentProperty ({ log, item }: {
  log:  Console
  item: any
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
export function documentMethod ({ log, index, item, name }: {
  log:   Console
  index: Index,
  item:  any
  name:  string
}) {
  log.debug('  method', item.name)
  let output = ''
  let source = item.sources[0].url
  const isAbstract = item.flags?.isAbstract ? 'abstract ' : ''
  output += `\n\n## ${isAbstract}method [*${name}.${item.name}*](${source})`
  if (item.signatures) {
    for (const signature of item.signatures) {
      output += documentSignature({ log, index, signature, item, name })
    }
  }
  return output
}

/** Generate Markdown documentation for a signature of a function or method. */
export function documentSignature ({ log, index, signature, item, name }: {
  log:   Console,
  index: Index,
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
  output += documentParameters({ log, index, signature })
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
export function documentParameters ({ log, index, signature }: {
  log:   Console,
  index: Index
  signature: Signature
}) {

  let output = ''

  if (signature.parameters?.length === 1) {
    documentSingleParameter()
  } else if (signature.parameters) {
    documentMultipleParameters()
  } else {
    documentNoParameters()
  }

  return output

  function documentSingleParameter () {
    const [parameter] = signature.parameters
    output += `(`
    if (parameter.name !== '__namedParameters') {
      output += `${parameter.name}`
      if (parameter.type) {
        output += ': '
      }
    }
    if (parameter.type) {
      const type = documentParameterType({ log, index, argType: parameter.type, indent: '  ' })
      const match = type.match(RE_PARENS)
      output += match ? match[1] : type
    }
    output += `)`
  }

  function documentMultipleParameters () {
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
        const type = documentParameterType({ log, index, argType: parameter.type })
        const match = type.match(RE_PARENS)
        output += match ? match[1] : type
        output += '</em>'
      }
      output += `,`
    }
    output += `\n)`
  }

  function documentNoParameters () {
    output += '()'
  }
}

/** Generate Markdown documentation for a single parameter of a function or method. */
export function documentParameterType ({ log, index, argType, indent = '    ' }: {
  log: Console
  index: Index,
  indent?: string
  argType: {
    name?: string
    type: string
    elementType?
    typeArguments?
    types?
    elements?
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
    output += '(' + argType.types.map(t=>documentParameterType({
      log,
      index,
      argType: t,
      indent
    })).join(' | ') + ')'
  }

  function documentIntersection () {
    if (argType.types.every(t=>(isInPlace(t) || isPartial(t)))) {
      documentIntersectionFlat()
    } else {
      output += '(' + argType.types.map(t=>documentParameterType({
        log,
        index,
        argType: t,
        indent
      })).join(' & ') + ')'
    }
  }

  function documentIntersectionFlat () {
    const children: Record<string, { name: string }> = {}
    for (const type of argType.types) {
      if (isInPlace(type)) {
        for (const child of type.declaration.children) {
          children[child.name] = child
        }
      } else if (isPartial(type)) {
        const target = index[type.typeArguments[0].target]
        const properties = (target.children as any[]).filter(c=>c.kind===KIND.PROPERTY)
        for (const child of properties) {
          children[child.name] = child
        }
      } else {
        throw new Error('unreachable!')
      }
    }
    output += '('
    output += documentParameterType({
      log, index, indent, argType: {
        type: 'reflection',
        declaration: {
          variant: 'declaration',
          children: Object.values(children)
            .sort((a,b)=>(a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0)
        }
      }
    })
    output += ')'
  }

  function documentTuple () {
    output += '['
    output += argType.elements.map(t=>documentParameterType({
      log,
      index,
      argType: t.element,
      indent
    })).join(', ')
    output += ']'
  }

  function documentReflection () {
    if (
      (argType.declaration?.variant === 'declaration') &&
      !!argType.declaration.children
    ) {
      output += '{'
      output += argType.declaration.children.map(field=>`\n${indent}${field.name},`).join('')
      if (argType.declaration.children.length > 0) {
        output += '\n'
      }
      output += `${indent.slice(2)}}`
    } else {
      log.warn('unhandled reflection:', argType.declaration.signatures)
      output += argType.name || '???'
    }
  }
}

function isInPlace (t) {
  return (
    t.type==='reflection'&&
    t.declaration.variant==='declaration'&&
    t.declaration.kind===65536
  )
}

function isPartial (t) {
  return (
    t.type==='reference'&&
    t.name==='Partial'&&
    t.package==='typescript'
  )
}
