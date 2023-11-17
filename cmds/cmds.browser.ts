export * from './cmds-command'
export { default as Command } from './cmds-command'
export * from './cmds-step'
export { default as Step } from './cmds-step'

import Command from './cmds-command'
import Step from './cmds-step'
import type { StepFn, Steps } from './cmds-step'
import { hideProperties } from '@hackbg/hide'
import { timestamp } from '@hackbg/time'
import { Console, Logged, colors, bold } from '@hackbg/logs'

export type CommandTree<T extends CommandContext> = Record<string, Command<T>|CommandContext>

export default class CommandContext extends Logged {
  /** Start of command execution. */
  timestamp: string = timestamp()
  /** Process environment at lauch of process. */
  env: Record<string, string|undefined> = { ...process.env }
  /** Current working directory at launch of process. */
  cwd: string = process.cwd()
  /** All registered commands. */
  commandTree: CommandTree<this> = {}
  /** Currently executing command. */
  currentCommand: string = ''
  /** Extra arguments passed from the command line. */
  args: string[] = []

  constructor (
    public label:       string  = new.target.constructor.name,
    public description: string  = '@hackbg/cmds',
  ) {
    super()
    this.log.label = label
    hideProperties(this, 'cwd', 'env')
  }

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

  /** Filter commands by each word from the list of arguments
    * then pass the rest as arguments to the found command. */
  parse (args: string[]): [Command<this>|CommandContext|null, ...string[]] {
    return parseCommandLine(this.commandTree, args)
  }

  /** Run a command from this command tree. */
  async run <T> (argv: string[], context: any = this): Promise<T> {
    // If no arguments were passed, exit.
    if (argv.length === 0) {
      this.log.br()
      this.log.info('No command invoked.')
      this.printUsage(this)
      return null as unknown as T
    }
    // Parse the command and arguments
    const [command, ...args] = this.parse(argv)
    // Run the command
    if (command) {
      return await command.run(args, context) as T
    }
    // If no command was run, print usage and throw
    this.printUsage(this)
    throw new Error(`Invalid invocation: "${argv.join(' ')}"`)
  }

  printUsage ({ constructor: { name }, commandTree }: CommandContext) {
    // Align
    const columns = { name: 0, sub: 0 }
    for (const name of Object.keys(commandTree)) {
      columns.name = Math.max(name.length, columns.name)
      let sub = 0
      if ((commandTree[name] as any).commandTree) {
        sub = String(Object.keys((commandTree[name] as any).commandTree).length).length
      }
      columns.sub = Math.max(sub, columns.sub)
    }
    columns.name += 1
    columns.sub  += 2
    // Display
    const commands = Object.entries(commandTree)
    if (commands.length < 1) {
      this.log.info(`${name} defines no commands.`)
      return
    }
    this.log.br()
    for (let [name, entry] of Object.entries(commandTree)) {
      name = bold(name.padEnd(columns.name))
      let sub = ''
      if ((entry as any).commandTree) {
        const keys = Object.keys((entry as any).commandTree)?.length ?? 0
        sub = `...`
      }
      sub = sub.padStart(columns.sub).padEnd(columns.sub + 1)
      this.log.info(`${name} ${sub} ${entry.description}`)
    }
    this.log.br()
  }
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
