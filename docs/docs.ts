import { Console } from '@hackbg/logs'
import * as Impl from './docs-impl'
import * as Util from './docs-util'
import * as FS from 'node:fs'

const console = new Console('@hackbg/logs')

/** Generate one or more pages of documentation
  * from the output of `typedoc --json`. */
export function generateDocumentation ({ log, data, pages }: {
  log?:  Console,
  data:  Impl.JSONDocs,
  pages: Record<string, Impl.PageSpec>
}) {
  // Make sure we have the JSON output of Typedoc.
  if (!data) {
    throw new Error('Option "data" is empty: pass parsed output of "typedoc --json".')
    // TODO: Automatically invoke typedoc to generate this.
  }
  // Generate each page.
  const documentation = new Documentation({ log, data })
  for (const [target, { sources }] of Object.entries(pages)) {
    documentation.generatePage({ target, sources })
  }
}

export class Documentation {
  /** A `@hackbg/logs` logger. */
  log = new Console('@hackbg/logs')
  /** The output of `typedoc --json` */
  data: Impl.JSONDocs
  /** All entities in `data` indexed by key. */
  index: Impl.Index

  constructor ({ log, data }: {
    log?: Console,
    data: Impl.JSONDocs
  }) {
    this.log   = log || new Console('@hackbg/logs')
    this.data  = data
    this.index = Util.collect({ log: this.log, data })
  }

  generatePage ({ target, sources }: {
    target:  string,
    sources: string[]
  }) {
    return new DocumentationPage({
      log:     this.log,
      data:    this.data,
      index:   this.index,
      sources,
      target
    }).generate()
  }
}

/** A page of documentation. */
export class DocumentationPage {
  /** A `@hackbg/logs` logger. */
  log:     Console
  /** The output of `typedoc --json` */
  data:    Impl.JSONDocs
  /** All entities in `data` indexed by key. */
  index:   Impl.Index
  /** A collection of source specifications. */
  sources: string[]
  /** Output file name. */
  target:  string

  constructor ({log, data, index, sources, target}: {
    log?:    Console
    data:    Impl.JSONDocs,
    index:   Impl.Index,
    sources: string[]
    target:  string
  }) {
    this.log     = log || new Console(target)
    this.data    = data
    this.index   = index
    this.sources = sources
    this.target  = target
  }

  generate () {
    const target = this.target
    const start  = '<!-- @hackbg/docs: begin -->'
    const end    = '<!-- @hackbg/docs: end -->'
    const { before, after } = Util.getAuthoredContent({ target, start, end })
    const generated = Impl.documentModule({ ...this, target })
    FS.writeFileSync(target, [ before, start, generated, end, after ].join(''), 'utf8')
    this.log(`Wrote ${target}.`)
  }
}
