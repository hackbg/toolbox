import $ from '@hackbg/kabinet'
import { CustomConsole, bold, colors, timestamp } from '@hackbg/konzola'

Error.stackTraceLimit = Math.max(1000, Error.stackTraceLimit) // Never hurts

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

export abstract class Timed<T, U> {
  started?: number|false = false
  ended?:   number|false = false
  result?:  T
  failed?:  U
  get took (): string|undefined {
    return (this.ended && this.started)
      ? `${((this.ended - this.started)/1000).toFixed(3)}s`
      : undefined
  }
  protected start (): number {
    if (this.started) throw new Error('Already started')
    return this.started = + new Date()
  }
  protected end (): number {
    if (!this.started) throw new Error('Not started yet')
    if (this.ended) throw new Error('Already ended')
    return this.ended = + new Date()
  }
  protected succeed (result: T): number {
    const end = this.end()
    this.result = result
    return end
  }
  protected fail (failed: U): number {
    const end = this.end()
    this.failed = failed
    throw failed
  }
}

/** Base class for class-based deploy procedure. Adds progress logging. */
export class Task<C, X> extends Lazy<X> {

  static get run () {
    const self = this
    Object.defineProperty(runTask, 'name', { value: `run ${this.name}` })
    return runTask
    async function runTask <C> (context: C) {
      return new self(context, () => {/*ignored*/})
    }
  }

  console = console

  constructor (public readonly context: C, getResult: ()=>X) {
    let self: this
    super(()=>{
      this.console.info()
      this.console.info('Task     ', this.constructor.name ? bold(this.constructor.name) : '')
      return getResult.bind(self)()
    })
    self = this
  }

  subtask <X> (cb: ()=>X|Promise<X>): Promise<X> {
    const self = this
    return new Lazy(()=>{
      this.console.info()
      this.console.info('Subtask  ', cb.name ? bold(cb.name) : '')
      return cb.bind(self)()
    })
  }

}

/** A step is a value object around a function that takes context as first argument. */
export class Step<C, D> extends Timed<D, Error> {

  static into <C, D> (specifier: Step<unknown, unknown>|Function|unknown): Step<C, D> {
    if (typeof specifier === 'function') {
      return new (this as any)(specifier)
    } else if (specifier instanceof Step) {
      return specifier
    } else {
      throw new Error(`Can't create step from: ${specifier}`)
    }
  }

  constructor (
    public impl: (this: C, ...args: any[]) => D|Promise<D>,
    public name = impl.name,
    public info?: string
  ) {
    super()
  }

  /** - Always async.
    * - Bind "this" in impl.
    * - Return updated copy of context. */
  async run (context: C, ...args: any[]): Promise<D> {
    this.start()
    let result: D
    try {
      const result = await Promise.resolve(this.impl.apply({ ...context }, args))
      if (typeof result !== 'object') {
        log.warn(`Step "${this.name}" returned a non-object.`)
      } else {
        if (Object.getPrototypeOf(result) !== Object.getPrototypeOf({})) {
          log.warn(`Step "${this.name}" returned a non-plain object.`)
        }
        context = { ...context, ...result }
      }
      this.succeed(result)
    } catch (e) {
      this.fail(e)
    }
    return context as unknown as D
  }

}

/** Run several operations in parallel in the same context. */
export function parallel (...operations: Function[]) {
  return function parallelOperations (context: { run: Function }) {
    return Promise.all(operations.map(command=>context.run(command)))
  }
}

/** A command is a binding between a string and one or more steps
  * that operate sequentially on the same context.  */
export class Command<C extends object> extends Timed<C, Error> {

  constructor (
    readonly name:    string             = '',
    readonly info:    string             = '',
    readonly steps:   Step<C, unknown>[] = [],
    private  context: C                  = {} as C
  ) {
    super()
  }

  /** Run the command with the specified arguments.
    * Commands can be ran only once. */
  async run <C extends typeof this, D extends typeof this> (
    args: string[] = process.argv.slice(2)
  ): Promise<D> {
    if (this.started) {
      throw new Error('Command already started.')
    }
    this.started = + new Date()
    for (const step of this.steps) {
      try {
        this.context = step.run(this.context) as typeof this.context
      } catch (e) {
        this.failed = e
        break
      }
    }
    this.ended = + new Date()
    log.commandEnded(this)
    if (this.failed) throw this.failed
    return this.context as unknown as D
  }

  get longestName (): number {
    return this.steps
      .map((step?: { name?: string })=>step?.name||'(unnamed step)')
      .reduce((max: number, x: string)=>Math.max(max, x.length), 0)
  }

}

export class Commands<C extends object> {

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
    this.commands[name] = new Command(
      name, info, [...this.before, ...steps, ...this.after].map(Step.into)
    ) as unknown as Command<C>

    return this

  }

  /** Filter commands by each word from the list of arguments
    * then pass the rest as arguments to the found command. */
  parse (args: string[]): [Command<C>|null, ...string[]] {

    let commands = Object.entries(this.commands)

    for (let i = 0; i < args.length; i++) {

      const arg          = args[i]
      const nextCommands = []
      for (const [name, command] of commands) {
        if (name === arg) {
          return [command, ...args]
        } else if (name.startsWith(arg)) {
          nextCommands.push([name.slice(arg.length).trim(), command])
        }
      }

      commands = nextCommands as [string, Command<C>][]
      if (commands.length === 0) return [null]

    }

    return [null]

  }

  /** Parse and execute a command */
  async run (argv = process.argv.slice(2)) {
    if (argv.length === 0) {
      log.usage(this)
      process.exit(1)
    }
    const [command, ...args] = this.parse(argv)
    if (!command) {
      console.error('Invalid command:', ...args)
      process.exit(1)
    }
    return await command.run(args)
  }

  /** `export default myCommands.main(import.meta.url)`
    * once per module after defining all commands */
  entrypoint (url: string, args = process.argv.slice(2)): this {
    const self = this
    setTimeout(()=>{if (process.argv[1] === $(url).path) self.launch(args)}, 0)
    return self
  }

  launch (argv = process.argv.slice(2)) {
    const [command, ...args] = this.parse(argv)
    if (command) {
      return this.run(args)
    } else {
      log.usage(this)
      process.exit(1)
    }
  }

}

/** A context contains the environment context. It is extensible. */
export class Context {

  /** Start of command execution. */
  timestamp: string
    = timestamp()

  /** Process environment at lauch of process. */
  env: Record<string, string|undefined>
    = { ...process.env }

  /** Current working directory. */
  cwd: string
    = process.cwd()

  /** Currently registered commands. */
  commands: Record<string, Command<Context>>
    = {}

  /** Currently executing command. */
  command: string
    = ''

  /** Extra arguments passed from the command line. */
  args: string[]
    = []

  /** Run in the current context. */
  run <C extends this, D extends this> (
    operation:    Step<C, D>,
    extraContext: Record<string, any> = {},
    extraArgs:    unknown[] = []
  ): Promise<D> {
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

}

export class CommandsConsole extends CustomConsole {

  name = '@hackbg/komandi'

  // Usage of Command API
  usage ({ name, commands }: Commands<any>) {

    let longest = 0
    for (const name of Object.keys(commands)) {
      longest = Math.max(name.length, longest)
    }

    this.log()
    for (const [cmdName, { info }] of Object.entries(commands)) {
      this.log(`    ... ${name} ${bold(cmdName.padEnd(longest))}  ${info}`)
    }
    this.log()

  }

  commandEnded (command: Command<any>) {
    const result = command.failed ? colors.red('failed') : colors.green('completed')
    const took   = command.took
    console.info(`The command`, bold(command.name), result, `in`, command.took)
    for (const step of command.steps) {
      const name     = (step.name ?? '(nameless step)').padEnd(40)
      const status   = step.failed ? `${colors.red('fail')}` : `${colors.green('ok  ')}`
      const timing   = (step.took ?? '').padStart(10)
      console.info(status, bold(name), timing, 's')
    }
  }

}

export const log = new CommandsConsole(console)
