import $ from '@hackbg/kabinet'
import { Console, bold, colors, timestamp } from '@hackbg/konzola'

const console = Console('Komandi')

/** A promise that evaluates once. */
export class Lazy<X> extends Promise<X> {
  protected readonly resolver: ()=>X|PromiseLike<X>
  private resolved: PromiseLike<X>|undefined = undefined
  constructor (resolver: ()=>X|PromiseLike<X>) {
    super(()=>{})
    this.resolver ??= resolver
  }
  /** Lazy#then: only evaluated the first time it is awaited */
  then <Y, Z> (
    resolved:  (value:  X) => Y | PromiseLike<Y>,
    rejected?: (reason: Z) => Z | PromiseLike<Z>
  ): Promise<Y> {
    this.resolved ??= Promise.resolve(this.resolver())
    return this.resolved.then(resolved, rejected) as Promise<Y>
  }
}

export interface Command<C extends CommandContext> {
  info:  string,
  steps: Step<C, unknown>[]
}

export interface CommandContext {
  /** Run a subroutine in a copy of the current context, i.e. without changing the context. */
  run <C extends CommandContext, T> (
    operation:     Step<C, T>,
    extraContext?: Record<string, unknown>,
    ...extraArgs:  unknown[]
  ): Promise<T>
  /** Extra arguments passed from the command line. */
  cmdArgs:      string[]
  /** Start of command execution. */
  timestamp:    string
}

export type Step<C extends CommandContext, U> = (context: C, ...args: any[]) => U|Promise<U>

/** Error message or recovery function. */
export type StepOrInfo<C extends CommandContext, T> = string|((context: Partial<C>)=>T)

export class Commands<C extends CommandContext> {
  constructor (
    public readonly name:     string,
    public readonly before:   Step<C, unknown>[]         = [],
    public readonly after:    Step<C, unknown>[]         = [],
    public readonly commands: Record<string, Command<C>> = {}
  ) {}
  /** Define a command. Remember to put `.entrypoint(import.meta.url)`
    * at the end of your main command object. */
  command (name: string, info: string, ...steps: Step<C, unknown>[]) {
    // validate that all steps are functions
    for (const i in steps) {
      if (!(steps[i] instanceof Function)) {
        console.log({name, info, steps, i})
        throw new Error(`command: ${this.name} ${name}: invalid step ${i} (not a Function)`)
      }
    }
    // store command
    this.commands[name] = { info, steps: [...this.before, ...steps, ...this.after] }
    return this
  }
  /** Filter commands by each word from the list of arguments
    * then pass the rest as arguments to the found command. */
  parse (args: string[]): [string, Command<C>, string[]]|null {
    let commands = Object.entries(this.commands)
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      const nextCommands = []
      for (const [name, impl] of commands) {
        if (name === arg) {
          return [name, impl, args.slice(i+1)]
        } else if (name.startsWith(arg)) {
          nextCommands.push([name.slice(arg.length).trim(), impl])
        }
      }
      commands = nextCommands as [string, Command<C>][]
      if (commands.length === 0) {
        return null
      }
    }
    return null
  }
  /** `export default myCommands.main(import.meta.url)`
    * once per module after defining all commands */
  entrypoint (url: string, args = process.argv.slice(2)): this {
    const self = this
    setTimeout(()=>{
      if (process.argv[1] === $(url).path) self.launch(args)
    }, 0)
    return self
  }

  launch (args = process.argv.slice(2)) {
    const command = this.parse(args)
    if (command) {
      const [cmdName, { info, steps }, cmdArgs] = command
      console.info('$ fadroma', bold($(process.argv[1]).shortPath), bold(cmdName), ...cmdArgs)
      return this.run(args)
    } else {
      print(console).usage(this)
      process.exit(1)
    }
  }

  /** Parse and execute a command */
  async run <Context extends CommandContext> (
    args = process.argv.slice(2)
  ): Promise<Context> {
    if (args.length === 0) {
      //@ts-ignore
      print(console).usage(this)
      process.exit(1)
    }
    const command = this.parse(args)
    if (!command) {
      console.error('Invalid command', ...args)
      process.exit(1)
    }
    const [cmd, { info, steps }, cmdArgs] = command
    return await runOperation(cmd, info, steps, cmdArgs)
  }
}

export async function runSub <C extends CommandContext, T> (
  operation:    Step<C, T>,
  extraContext: Record<string, any> = {},
  extraArgs:    unknown[] = []
): Promise<T> {
  if (!operation) {
    throw new Error('Tried to run missing operation.')
  }
  const params = Object.keys(extraContext)
  console.info(
    'Running', bold(operation.name||'(unnamed)'),
    ...((params.length > 0) ? ['with set:', bold(params.join(', '))] : [])
  )
  try {
    //@ts-ignore
    return await operation({ ...this, ...extraContext }, ...extraArgs)
  } catch (e) {
    throw e
  }
}

export async function runOperation <Context extends CommandContext> (
  command:  string,
  cmdInfo:  string,
  cmdSteps: Function[],
  cmdArgs:  string[] = [],

  // Establish context
  context: Partial<CommandContext> = {
    cmdArgs,
    timestamp: timestamp(),
  }
): Promise<Context> {

  // Never hurts:
  Error.stackTraceLimit = Math.max(1000, Error.stackTraceLimit)

  // Will count milliseconds
  const stepTimings = []

  // Start of command
  const T0 = + new Date()

  // Will align output
  const longestName = cmdSteps
    .map((step?: { name?: string })=>step?.name||'(unnamed step)')
    .reduce((max: number, x: string)=>Math.max(max, x.length), 0)

  // Store thrown error and print report before it
  let error

  // Execute each step, updating the context
  for (const step of cmdSteps) {

    // Skip empty steps
    if (!(step instanceof Function)) continue

    // Pad the name
    const name = (step.name||'').padEnd(longestName)

    // Start of step
    const T1 = + new Date()

    try {
      // Add step runner
      context.run = runSub.bind(context)

      // Object returned by step gets merged into context.
      const updates = await step({ ...context })

      // On every step, the context is recreated from the old context and the updates.
      context = { ...context, ...updates }

      // End of step
      const T2 = + new Date()

      stepTimings.push([name, T2-T1, false])
    } catch (e) {
      // If the step threw an error, store the timing and stop executing new steps
      error = e
      const T2 = + new Date()
      stepTimings.push([name, T2-T1, true])
      break
    }
  }

  // Final execution report
  const T3 = + new Date()
  const result = error ? colors.red('failed') : colors.green('completed')
  console.info(`The command`, bold(command), result, `in`, ((T3-T0)/1000).toFixed(3), `s`)

  // Print timing of each step
  for (const [name, duration, isError] of stepTimings as [string, number, boolean][]) {
    const status   = isError?`${colors.red('FAIL')}`:`${colors.green('OK  ')}`
    const stepName = bold((name||'(nameless step)').padEnd(40))
    const timing   = (duration/1000).toFixed(1).padStart(10)
    console.info(status, stepName, timing, 's')
  }

  // If there was an error throw it now
  if (error) {
    throw error
  }

  return context as Context
}
export function rebind (self: Record<string, unknown>, obj = self) {
  for (const key in obj) {
    if (obj[key] instanceof Function) {
      obj[key] = (obj[key] as Function).bind(self)
    }
  }
}
/** Run several operations in parallel in the same context. */
export function parallel (...operations: Function[]) {
  return function parallelOperations (context: { run: Function }) {
    return Promise.all(operations.map(command=>context.run(command)))
  }
}

export const print = ({ log }: { log: Function }) => {
  return {
    // Usage of Command API
    usage <C extends CommandContext> ({ name, commands }: Commands<C>) {
      let longest = 0
      for (const name of Object.keys(commands)) {
        longest = Math.max(name.length, longest)
      }
      log()
      for (const [cmdName, { info }] of Object.entries(commands)) {
        log(`    ... ${name} ${bold(cmdName.padEnd(longest))}  ${info}`)
      }
      log()
    },
  }
}

export * from '@hackbg/konfizi'
