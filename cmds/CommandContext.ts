import { hideProperties } from '@hackbg/hide'
import { timestamp } from '@hackbg/time'
import { Task } from '@hackbg/task'
import type { Console } from '@hackbg/logs'

import CommandsConsole from './CommandsConsole'
import Command from './Command'
import Step from './Step'
import type { StepFn, Steps } from './Step'

import { fileURLToPath } from 'node:url'

export default class CommandContext {

  constructor (
    public label: string = new.target.constructor.name,
    public description: string = 'undocumented',
    repl: boolean = true
  ) {
    this.label       ??= this.constructor.name
    this.description ??= 'undocumented'
    this.log = new CommandsConsole(label)
    hideProperties(this, 'cwd', 'env')
    if (repl) {
      this.addCommand(
        'repl',
        'run an interactive shell in this context',
        this.startREPL.bind(this)
      )
    }
  }

  log:
    CommandsConsole

  /** Start of command execution. */
  timestamp: string =
    timestamp()

  /** Process environment at lauch of process. */
  env: Record<string, string|undefined> =
    { ...process.env }

  /** Current working directory at launch of process. */
  cwd: string =
    process.cwd()

  /** All registered commands. */
  commandTree: CommandTree<this> =
    {}

  /** Currently executing command. */
  currentCommand: string =
    ''

  /** Extra arguments passed from the command line. */
  args: string[] = []

  before = async (context: any = this): Promise<void> => {}

  /** Define a command during construction.
    * @returns the passed command
    * @example
    *   class MyCommands extends CommandContext {
    *     doThing = this.command('do-thing', 'command example', async function doThing () {
    *       // implementation
    *     })
    *   } */
  command <X extends StepFn<this, unknown>> (name: string, description: string, step: X): X {
    this.addCommand(name, description, step)
    return step
  }

  /** Define a command subtree during construction.
    * @returns the passed command subtree
    * @example
    *   class MyCommands extends CommandContext {
    *     doThings = this.commands('sub', 'command subtree example', new SubCommands())
    *   }
    *   class SubCommands extends CommandContext {
    *     // ...
    *   }
    **/
  commands <C extends CommandContext> (name: string, description: string, subtree: C): C {
    this.addCommands(name, description, subtree)
    return subtree
  }

  /** Define a command after the instance is constructed.
    * @returns this
    * @example
    *   export default new CommandContext()
    *     .addCommand('foo', 'do one thing', async () => { ... })
    *     .addCommand('bar', 'do another thing', () => { ... })
    **/
  addCommand (name: string, description: string, ...steps: Steps<this>): this {
    // store command
    this.commandTree[name] = new Command(name, description, steps.map(step=>Step.from(step)))
    return this
  }

  /** Define a command subtree after the instance is constructed.
    * @returns this
    * @example
    *   export default new CommandContext()
    *     .addCommands('empty', 'do nothing in new context', new CommandContext())
    *     .addCommands('baz', 'do some more things', new CommandContext()
    *       .addCommand(...)
    *       .addCommand(...))
    **/
  addCommands (name: string, description: string, subtree: CommandContext): this {
    subtree.description = description
    this.commandTree[name] = subtree
    return this
  }

  /** Define a lazy task, which is like a promise but does not start evaluating immediately.
    * Instead, it evaluates once you `await` it or call `.then(...)` on it.
    * @returns Task */
  task = <X> (name: string, cb: ()=>X|Promise<X>): Task<this, X> => {
    return new Task(name, cb, this)
  }

  /** Filter commands by each word from the list of arguments
    * then pass the rest as arguments to the found command. */
  parse (args: string[]): [Command<this>|CommandContext|null, ...string[]] {
    return parseCommandLine(this.commandTree, args)
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
        this.log.usage(this)
        this.exit(1)
      }
    })
    return this
  }

  /** Run a command from this command tree. */
  async run <T> (argv: string[], context: any = this): Promise<T> {
    // If no arguments were passed, exit.
    if (argv.length === 0) {
      this.log.br()
      this.log.info('No command invoked.')
      this.log.usage(this)
      return null as unknown as T
    }
    // Parse the command and arguments
    const [command, ...args] = this.parse(argv)
    // Run the command
    if (command) {
      await this.before(context)
      return await command.run(args, context) as T
    }
    // If no command was run, print usage and throw
    this.log.usage(this)
    throw new Error(`Invalid invocation: "${argv.join(' ')}"`)
  }

}

export type CommandTree<T extends CommandContext> = Record<string, Command<T>|CommandContext>

export function isEntrypoint (url: string) {
  return process.argv[1] === fileURLToPath(url)
}

export function entrypoint (url: string, callback: Function) {
  if (isEntrypoint(url)) callback()
}

export function startRepl (context: any, log: Console = new CommandsConsole()) {
  return Promise.all([
    //@ts-ignore
    import('node:repl'),
    //@ts-ignore
    import('node:vm')
  ]).then(([repl, { createContext }])=>{
    let prompt = '\nFadroma> '
    let context = createContext(this)
    setTimeout(()=>Object.assign(repl.start({ prompt }), { context }))
  }).catch((e: Error)=>{
    this.log.warn(e)
    this.log.info('REPL is only available in Node.')
  })
}

export function parseCommandLine <T extends CommandContext> (
  commandTree: CommandTree<T>,
  commandLine: string[]
): [Command<T>|CommandContext|null, ...string[]] {
  let commands = Object.entries(commandTree)
  for (let i = 0; i < commandLine.length; i++) {
    const arg = commandLine[i]
    const nextCommands = []
    for (const [name, command] of commands) {
      if (name === arg) {
        return [command, ...commandLine.slice(i+1)]
      } else if (name.startsWith(arg)) {
        nextCommands.push([name.slice(arg.length).trim(), command])
      }
    }
    commands = nextCommands as [string, Command<T>][]
    if (commands.length === 0) return [null]
  }
  return [null]
}
