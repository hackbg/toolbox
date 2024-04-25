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

export function documentModule ({
  data,
  sources,
}: {
  data: {
    symbolIdMap: Record<string, {
      sourceFileName: string,
      qualifiedName:  string
    }>
  },
  sources: string[]
}) {

  const ids = new Set()

  for (const [symbol, { sourceFileName, qualifiedName }] of Object.entries(data.symbolIdMap)) {
    if (sources.includes(sourceFileName)) {
      ids.add(Number(symbol))
    }
  }

  recurseIntoModule(data)

  function recurseIntoModule (node) {

    for (const child of node.children) {

      if (ids.has(child.id)) {
        if (!Object.values(kinds).includes(child.kind)) {
          console.warn('Unknown kind', child.kind, child)
          continue
        }
        if (child.kind === kinds.class) {
          documentClass(child)
        }
      }

      if (child.children) {
        recurseIntoModule(child)
      }

    }

  }

}

export function documentClass (child) {
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
      documentConstructor(item)
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

export function documentConstructor (item) {
  process.stdout.write('\n```typescript\n')
  for (const signature of item.signatures) {
    if (signature.parameters?.length > 0) {
      process.stdout.write(`${signature.name}(`)
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
