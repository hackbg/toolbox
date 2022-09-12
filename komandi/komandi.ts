import { CustomConsole, bold, colors, timestamp } from '@hackbg/konzola'
import { fileURLToPath } from 'url'

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

  log: CustomConsole = new CustomConsole(console, this.constructor.name)

  constructor (public readonly context: C, getResult: ()=>X) {
    let self: this
    super(()=>{
      this.log.info()
      this.log.info('Task     ', this.constructor.name ? bold(this.constructor.name) : '')
      return getResult.bind(self)()
    })
    self = this
  }

  task <X> (cb: ()=>X|Promise<X>): Promise<X> {
    const self = this
    return new Lazy(()=>{
      this.log.info()
      this.log.info('Subtask  ', cb.name ? bold(cb.name) : '')
      return cb.bind(self)()
    })
  }

  static get run () {
    const self = this
    Object.defineProperty(runTask, 'name', { value: `run ${this.name}` })
    return runTask
    async function runTask <C> (context: C) {
      return new self(context, () => {/*ignored*/})
    }
  }

}

export type StepFn<C, D> = (this: C, ...args: any[]) => D|Promise<D>

/** A step is a value object around a function that takes context as first argument. */
export class Step<C, D> extends Timed<D, Error> {

  log: CustomConsole

  constructor (
    public impl: StepFn<C, D>,
    public name = impl.name,
    public info?: string
  ) {
    super()
    this.log = new CustomConsole(console, this.name)
  }

  /** - Always async.
    * - Bind "this" in impl.
    * - Return updated copy of context. */
  async call (context: C, ...args: any[]): Promise<D> {
    this.start()
    let result: D
    try {
      const result = await Promise.resolve(this.impl.call(context, ...args))
      this.succeed(result as D)
      return result
    } catch (e) {
      this.fail(e as Error)
    }
  }

  static from <C, D> (specifier: Step<unknown, unknown>|Function|unknown): Step<C, D> {
    if (specifier instanceof Step) {
      return specifier
    } else if (typeof specifier === 'function') {
      return new (this as any)(specifier)
    } else {
      throw new Error(`Can't create step from: ${specifier}`)
    }
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
  ) {
    super()
    this.log = new CommandsConsole(console, this.name)
    Object.defineProperty(this, 'log', { enumerable: false, writable: true })
  }

  log: CommandsConsole

  /** Run the command with the specified arguments. */
  async run (
    args:    string[] = process.argv.slice(2),
    context: any = this
  ): Promise<unknown> {
    if (this.started) {
      throw new Error('Command already started.')
    }
    this.started = + new Date()
    let result
    for (const step of this.steps) {
      try {
        result = await step.call(context, ...args)
      } catch (e) {
        this.failed = e as Error
        break
      }
    }
    this.ended = + new Date()
    this.log.commandEnded(this)
    if (this.failed) throw this.failed
    return result
  }

  get longestName (): number {
    return this.steps
      .map((step?: { name?: string })=>step?.name||'(unnamed step)')
      .reduce((max: number, x: string)=>Math.max(max, x.length), 0)
  }

}

export class CommandContext {

  constructor (
    public readonly name: string,
    public readonly info: string = 'undocumented'
  ) {
    this.log = new CommandsConsole(console, name)
    if (!process.env.DEBUG) {
      Object.defineProperty(this, 'cwd', { enumerable: false, writable: true })
      Object.defineProperty(this, 'env', { enumerable: false, writable: true }) // perfe
    }
  }

  log: CommandsConsole

  /** Start of command execution. */
  timestamp: string = timestamp()

  /** Process environment at lauch of process. */
  env: Record<string, string|undefined> = { ...process.env }

  /** Current working directory at launch of process. */
  cwd: string = process.cwd()

  /** All registered commands. */
  commandTree: Record<string, Command<this>|CommandContext> = {}

  /** Currently executing command. */
  currentCommand: string = ''

  /** Extra arguments passed from the command line. */
  args: string[] = []

  task <X> (cb: ()=>X|Promise<X>): Promise<X> {
    const self = this
    return new Lazy(()=>{
      this.log.info()
      this.log.info('Task  ', cb.name ? bold(cb.name) : '')
      return cb.bind(self)()
    })
  }

  /** Define a command. Remember to put `.entrypoint(import.meta.url)`
    * at the end of your main command object. */
  command (
    name: string,
    info: string,
    ...steps: (Step<this, unknown>|StepFn<this, unknown>)[]
  ): this {
    // store command
    this.commandTree[name] = new Command(name, info, steps.map(step=>Step.from(step)))
    return this
  }

  /** Define a command subtree. */
  commands (name: string, info: string, subtree: CommandContext): this {
    this.commandTree[name] = subtree
    return this
  }

  addCommand <X extends StepFn<this, unknown>> (name: string, info: string, step: X): X {
    this.command(name, info, step)
    return step
  }

  addCommands <C extends CommandContext> (name: string, info: string, subtree: C): C {
    this.commands(name, info, subtree)
    return subtree
  }

  /** `export default myCommands.main(import.meta.url)`
    * once per module after defining all commands */
  entrypoint (url: string, argv = process.argv.slice(2)): this {
    const self = this
    if (process.argv[1] === fileURLToPath(url)) {
      const [command, ...args] = this.parse(argv)
      if (!command) {
        this.log.usage(this)
        this.exit(1)
      }
      setTimeout(async()=>await self.run(argv).then(this.exit), 0)
    }
    return self
  }

  async run (argv: string[], context: any = this) {
    const [command, ...args] = this.parse(argv)
    if (command) {
      return await command.run(args, context)
    } else {
      console.error('Invalid command:', ...args)
      throw new Error(`Invalid command: ${args.join(' ')}`)
    }
  }

  /** Filter commands by each word from the list of arguments
    * then pass the rest as arguments to the found command. */
  parse (args: string[]): [Command<this>|CommandContext|null, ...string[]] {
    let commands = Object.entries(this.commandTree)
    for (let i = 0; i < args.length; i++) {
      const arg          = args[i]
      const nextCommands = []
      for (const [name, command] of commands) {
        if (name === arg) {
          return [command, ...args.slice(i+1)]
        } else if (name.startsWith(arg)) {
          nextCommands.push([name.slice(arg.length).trim(), command])
        }
      }
      commands = nextCommands as [string, Command<this>][]
      if (commands.length === 0) return [null]
    }
    return [null]
  }

  exit (code: number = 0) {
    process.exit(code)
  }

}

export class CommandsConsole extends CustomConsole {

  constructor (...args: ConstructorParameters<typeof CustomConsole>) {
    const [console, name = '@hackbg/komandi'] = args
    super(console, name)
  }

  // Usage of Command API
  usage ({ name, commandTree }: CommandContext) {
    let longest = 0
    for (const name of Object.keys(commandTree)) {
      longest = Math.max(name.length, longest)
    }
    this.log()
    for (const [cmdName, { info }] of Object.entries(commandTree)) {
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
