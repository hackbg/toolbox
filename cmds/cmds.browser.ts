export * from './cmds-command.ts'
export { default as Command } from './cmds-command.ts'
export * from './cmds-step.ts'
export { default as Step } from './cmds-step.ts'

import Command from './cmds-command.ts'
import type { StepFn } from './cmds-step.ts'
import { hideProperties } from '@hackbg/hide'
import { timestamp } from '@hackbg/time'
import { Logged, bold } from '@hackbg/logs'

export type CommandTree<T extends CommandContext> =
  Record<string, Command<T>|CommandContext>

declare const globalThis: { process?: { env: object, cwd: () => string } }

export default class CommandContext extends Logged {
  /** Name of this command tree. */
  name: string
  /** Description of this command tree. */
  info: string

  /** Start of command execution. */
  timestamp: string = timestamp()
  /** Process environment at lauch of process. */
  env: Record<string, string|undefined> = { ...globalThis.process?.env||{} }
  /** Current working directory at launch of process. */
  cwd: string = globalThis!.process?.cwd() || '.'
  /** All registered commands. */
  commandTree: CommandTree<this> = {}
  /** Currently executing command. */
  currentCommand: string = ''
  /** Extra arguments passed from the command line. */
  args: string[] = []

  constructor (options: Partial<{
    name: string,
    info: string
  }> = {}) {
    super()
    this.name = options.name ?? ''
    this.info = options.info ?? 'CLI by @hackbg/cmds'
    this.log.label = this.name
    hideProperties(this, 'cwd', 'env')
  }

  /** Define a command and return it. */
  command <X extends StepFn<this, unknown>> (parameters: {
    name:  string,
    args?: string,
    info?: string,
  }, step: X): X {
    this.addCommand(parameters, step)
    return step
  }

  /** Define a command and return `this`. */
  addCommand <X extends StepFn<this, unknown>> (parameters: {
    name:  string,
    args?: string,
    info?: string,
  }, step: X): this {
    // store command
    this.commandTree[parameters.name] = new Command({
      name: parameters.name,
      args: parameters.args,
      info: parameters.info,
      steps: [step as any]
    })
    return this
  }

  /** Attach a command subtree and return it. */
  commands <C extends CommandContext> (name: string, info: string, subtree: C): C {
    this.addCommands(name, info, subtree)
    return subtree
  }

  /** Attach a command subtree and return this. */
  addCommands (name: string, info: string, subtree: CommandContext): this {
    subtree.info = info
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
      this.printUsageNoCommand(this)
      return null as unknown as T
    }
    // Parse the command and arguments
    const [command, ...args] = this.parse(argv)
    // Run the command
    if (command) return await command.run(args, context) as T
    // If no command was run, print usage and throw
    this.printUsageMissingCommand(this)
    throw new Error(`Invalid invocation: "${argv.join(' ')}"`)
  }

  printUsageNoCommand (arg0: this) {
    this.log.br().error('No command invoked.')
    return this.printUsage(arg0)
  }

  printUsageMissingCommand (arg0: Parameters<typeof this["printUsage"]>[0]) {
    return this.printUsage(arg0)
  }

  printUsage ({ constructor: { name }, commandTree }: CommandContext) {
    // Align
    const columns = { name: 0, args: 0, sub: 0 }
    for (const name of Object.keys(commandTree)) {
      columns.name = Math.max(name.length, columns.name)

      let args = 0
      if ((commandTree[name] as any).args) {
        args = String((commandTree[name] as any).args).length
      }
      columns.args = Math.max(args, columns.args)

      let sub = 0
      if ((commandTree[name] as any).commandTree) {
        sub = String(Object.keys((commandTree[name] as any).commandTree).length).length
      }
      columns.sub = Math.max(sub, columns.sub)
    }
    columns.name += 1
    columns.sub  += 2
    // Display
    const entries = Object.entries(commandTree)
    if (entries.length > 0) {
      this.log.br()
      for (let [name, entry] of entries) {
        name = bold(name.padEnd(columns.name))
        let args = ''
        if (typeof (entry as any).args === 'string') {
          args = (entry as any).args
        }
        args = args.padEnd(columns.args)
        let sub = ''
        if ((entry as any).commandTree) {
          const keys = Object.keys((entry as any).commandTree)?.length ?? 0
          sub = `...`
        }
        sub = sub.padStart(columns.sub).padEnd(columns.sub + 1)
        this.log.info(`  ${name} ${args} ${sub} ${entry.info}`)
      }
    } else {
      this.log.warn(`${name} defines no commands.`)
    }
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
