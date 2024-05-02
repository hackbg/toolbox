import { Console } from '@hackbg/logs'
import * as Impl from './docs-impl'
import * as FS from 'node:fs'

const console = new Console('@hackbg/logs')

/** Generate one or more pages of documentation
  * from the output of `typedoc --json`. */
export function generateDocumentation (
  { data, pages }: { data: Impl.JSONDocs, pages: Record<string, Impl.PageSpec> }
) {

  // Make sure we have the JSON output of Typedoc.
  if (!data) {
    throw new Error('Option "data" is empty: pass parsed output of "typedoc --json".')
    // TODO: Automatically invoke typedoc to generate this.
  }

  // Generate each page.
  for (const [target, { sources }] of Object.entries(pages)) {
    new DocumentationPage({ data, sources }).generate(target)
  }

}

/** A page of documentation. */
export class DocumentationPage {
  /** A `@hackbg/logs` logger. */
  log = new Console('@hackbg/logs')
  /** The output of `typedoc --json` */
  data: Impl.JSONDocs
  /** A collection of source specifications. */
  sources: string[]

  constructor ({data, sources}: { data: Impl.JSONDocs, sources: string[] }) {
    this.data = data
    this.sources = sources
  }

  generate (target) {
    this.log.label = target
    const start = '<!-- @hackbg/docs: begin -->'
    const end   = '<!-- @hackbg/docs: end -->'
    const { before, after } = Impl.getAuthoredContent({ target, start, end })
    const generated = Impl.documentModule({ ...this, target })
    FS.writeFileSync(target, [ before, start, generated, end, after ].join(''), 'utf8')
    this.log(`Wrote ${target}.`)
  }
}
