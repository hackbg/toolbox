import { CustomConsole, bold, colors, timestamp } from '@hackbg/konzola'
import { fileURLToPath } from 'url'

Error.stackTraceLimit = Math.max(1000, Error.stackTraceLimit) // Never hurts

/** A promise that can be resolved externally. */
export class Deferred<X> extends Promise<X> {
  constructor () {
    // ts made me do it!
    let _resolve: (result: X|PromiseLike<X>)=>void = () => { throw new Error('unreachable') }
    let _reject:  (reason?: any)=>void             = () => { throw new Error('unreachable') }
    super((resolve, reject)=>{
      _resolve = resolve
      _reject  = reject
    })
    this.resolve = _resolve
    this.reject  = _reject
  }
  /** Resolve the promise. */
  resolve: (result: X|PromiseLike<X>)=>void
  /** Reject the promise. */
  reject:  (reason?: any)=>void
  /** Some magic CC BY-SA 4.0 https://stackoverflow.com/a/60328122 */
  static get [Symbol.species]() { return Promise; }
  get [Symbol.toStringTag]() { return 'Deferred' }
}

/** A promise that only evaluates once. */
export class Lazy<X> extends Deferred<X> {
  static all = (lazies: Promise<unknown>[]) => new Lazy(()=>Promise.all(lazies))
  constructor (
    /** Function that performs the task, fulfilling the underlying Promise. */
    public resolver: ()=>X|PromiseLike<X>
  ) {
    super()
    const e = new Error()
    Error.captureStackTrace(e)
    this.stack = `\nCreated at:\n` + e.stack.split('\n').slice(1).join('\n')
    Object.defineProperty(this, 'stack', { enumerable: false, writable: false })
  }
  /** Whether the resolver was called. */
  called: boolean = false
  /** Captured stack at construction. Used for a more informative stack trace. */
  stack:  string  = ''
  /** Magic, see above. */
  get [Symbol.toStringTag]() { return 'Lazy' }
  /** Lazy#then works like Promise#then, but only evaluates the implementation
    * (`this.resolver`) when called for the first time, as opposed to the normal
    * behavior of a Promise, which starts evaluating as soon as it's constructed.
    * If the implementation rejects with an error, this method add the value of
    * `this.stack` to the error stack.
    * @returns Promise */
  async then <Y, Z> (
    resolved:  (value:  X) => Y | PromiseLike<Y>,
    rejected?: (reason: Z) => Z | PromiseLike<Z>
  ) {
    if (!this.called) {
      this.called = true
      try {
        this.resolve(await Promise.resolve(this.resolver()))
      } catch (e) {
        if (e instanceof Error) e.stack += this.stack
        this.reject(e)
      }
    }
    return await super.then(resolved, rejected)
  }
}

export type TaskCallback<X> = ()=>X|Promise<X>

/** Base class for class-based deploy procedure. Adds progress logging. */
export class Task<C, X> extends Lazy<X> {

  log: CustomConsole = new CustomConsole(this.constructor.name)

  name?: string

  cb?: TaskCallback<X>

  context?: C

  constructor (name: string, cb: TaskCallback<X>, context?: C)
  constructor (cb: TaskCallback<X>, context?: C)
  constructor (...args: unknown[]) {
    let name:    string
    let cb:      TaskCallback<X>
    let context: C
    if (typeof args[0] === 'string') {
      [name, cb, context] = args as [string, TaskCallback<X>, C]
      Object.defineProperty(cb, 'name', { value: name??cb.name })
    } else {
      [cb, context] = args as [TaskCallback<X>, C]
      name = cb.name
    }
    super(()=>Promise.resolve(null))
    this.name    = name
    this.cb      = cb
    this.context = context
    this.resolver = () => {
      this.log.info('Task     ', name)
      console.log(this)
      return this.cb.bind(this)()/*which is why this works*/
    }
    Object.defineProperty(this, 'log', { enumerable: false, writable: true })
  }

  //static get run () {
    //const self = this
    //Object.defineProperty(runTask, 'name', { value: `run ${this.name}` })
    //return runTask
    //async function runTask <C> (context: C) {
      //return new self(context, () => {[>ignored<]})
    //}
  //}

}

/** A task timer. */
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

export type StepFn<C, D> = (this: C, ...args: any[]) => D|Promise<D>

/** A step is a value object around a function that takes context as first argument. */
export class Step<C, D> extends Timed<D, Error> {

  constructor (
    public impl: StepFn<C, D>,
    public name = impl.name,
    public description?: string,
    public log: CustomConsole = new CustomConsole(`Step: ${name}`)
  ) {
    super()
    Object.defineProperty(this, 'log', { enumerable: false, writable: true })
  }

  /** - Always async.
    * - Bind "this" in impl.
    * - Return updated copy of context. */
  async call (context: C, ...args: any[]): Promise<D> {
    this.start()
    let result: D = undefined as unknown as D
    try {
      const result = await Promise.resolve(this.impl.call(context, ...args))
      this.succeed(result as D)
    } catch (e) {
      this.fail(e as Error)
    }
    return result as unknown as D
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
    readonly name:        string             = '',
    readonly description: string             = '',
    readonly steps:       Step<C, unknown>[] = [],
  ) {
    super()
    this.log = new CommandsConsole(this.name)
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

export type Steps<X> = (Step<X, unknown>|StepFn<X, unknown>)[]

export class CommandContext {

  constructor (
    public name: string,
    public description: string = 'undocumented'
  ) {
    this.log = new CommandsConsole(this.constructor.name)
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
  task = <X> (name: string, cb: ()=>X|Promise<X>): Task<this, X> =>
    new Task(name, cb, this)
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
      setTimeout(async()=>await self.run(argv).then(()=>this.exit(0)), 0)
    }
    return self
  }

  async run <T> (argv: string[], context: any = this): Promise<T> {
    if (argv.length === 0) {
      const message = 'No command invoked.'
      this.log.info(message)
      this.log.usage(this)
      return null as T
    }
    const [command, ...args] = this.parse(argv)
    if (command) {
      return await command.run(args, context) as T
    } else {
      const message = `No such command in ${this.constructor.name}.`
      this.log.warn(message)
      this.log.usage(this)
      throw new Error(message)
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

  name = '@hackbg/komandi'

  // Usage of Command API
  usage ({ constructor: { name }, commandTree }: CommandContext) {
    let longest = 0
    for (const name of Object.keys(commandTree)) {
      longest = Math.max(name.length, longest)
    }
    const commands = Object.entries(commandTree)
    if (commands.length > 0) {
      this.info()
      for (const [cmdName, { description }] of Object.entries(commandTree)) {
        this.info(`    ${bold(cmdName.padEnd(longest))}  ${description}`)
      }
      this.info()
    } else {
      this.info(`${name} exposes no commands.`)
    }
  }

  commandEnded (command: Command<any>) {
    const result = command.failed ? colors.red('failed') : colors.green('completed')
    const took   = command.took
    this.info(`The command`, bold(command.name), result, `in`, command.took)
    for (const step of command.steps) {
      const name     = (step.name ?? '(nameless step)').padEnd(40)
      const status   = step.failed ? `${colors.red('fail')}` : `${colors.green('ok  ')}`
      const timing   = (step.took ?? '').padStart(10)
      this.info(status, bold(name), timing, 's')
    }
  }

}
