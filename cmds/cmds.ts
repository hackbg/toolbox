export * from './cmds.browser'

import CommandContext from './cmds.browser'
import { fileURLToPath } from 'node:url'
import { Console, colors, bold } from '@hackbg/logs'

export default class LocalCommandContext extends CommandContext {

  constructor (...args: ConstructorParameters<typeof CommandContext>) {
    super(...args)
    this.addCommand('repl', 'run an interactive JavaScript REPL in this context', () =>
      this.startREPL())
  }

  /** If this command tree is the default export of the process entrypoint,
    * run the commands as specified by the process command line.
    * @example
    *     export default myCommands.main(import.meta.url) */
  entrypoint (url: string, argv = process.argv.slice(2)): this {
    entrypoint(url, () => {
      // Parse the command and arguments
      const [command, ...args] = this.parse(argv)
      if (command) {
        // Run the specified command
        // FIXME: why is this setTimeout here? maybe it's what's making exiting unreliable?
        setTimeout(async()=>await this.run(argv).then(()=>this.exit(0)), 0)
      } else {
        // If no command was specified, exit
        this.printUsage(this as any)
        this.exit(1)
      }
    })
    return this
  }

  /** Start an interactive REPL with this deployment as global context.
    * @throws if the `node:repl` and `node:vm` native modules are unavailable. */
  startREPL () {
    return startRepl(this, this.log)
  }

  /** End the process. */
  exit (code: number = 0) {
    process.exit(code)
  }

}

export function entrypoint (url: string, callback: Function) {
  if (isEntrypoint(url)) callback()
}

export function isEntrypoint (url: string) {
  return process.argv[1] === fileURLToPath(url)
}

export function startRepl (context: object, log = new Console('REPL')) {
  return Promise.all([
    //@ts-ignore
    import('node:repl'),
    //@ts-ignore
    import('node:vm')
  ]).then(([repl, { createContext }])=>{
    let prompt = '\nFadroma> '
    context = createContext(context)
    setTimeout(()=>Object.assign(repl.start({ prompt }), { context }))
  }).catch((e: Error)=>{
    log.warn(e)
    log.info('REPL is only available in Node.')
  })
}
