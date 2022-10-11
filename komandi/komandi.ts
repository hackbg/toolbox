import { CustomConsole, bold, colors, timestamp } from '@hackbg/konzola'
import { fileURLToPath } from 'url'

Error.stackTraceLimit = Math.max(1000, Error.stackTraceLimit) // Never hurts

function getStack (): string {
  const e = new Error()
  Error.captureStackTrace(e)
  return e.stack ? (`\nFrom:\n` + e.stack.split('\n').slice(2).join('\n')) : ''
}

/** A Promise that captures the stack at creation. */
export class Traced<X> extends Promise<X> {
  /** Captured stack at construction. Used for a more informative stack trace. */
  stack: string = process.env.Komandi_Trace ? getStack() : ''
  /** Create a promise and capture stack trace. */
  constructor (...args: ConstructorParameters<typeof Promise<X>>) {
    super(...args)
    Object.defineProperty(this, 'stack', { enumerable: false, writable: true })
  }
}

/** A promise that can be resolved from outsid . */
export class Deferred<X> extends Traced<X> {
  /** Whether the promise was already resolved or rejected. */
  completed: boolean = false
  /** Resolve the promise. */
  resolve:   (result: X|PromiseLike<X>)=>void
  /** Reject the promise. */
  reject:    (reason?: any)=>void
  /** Create a manually resolved promise. */
  constructor () {
    let _resolve: (result: X|PromiseLike<X>)=>void = () => { throw new Error('unreachable') }
    let _reject:  (reason?: any)=>void             = () => { throw new Error('unreachable') }
    super((resolve, reject)=>{
      _resolve = resolve
      _reject  = reject
    })
    this.resolve = x => { this.completed = true; _resolve(x); }
    this.reject  = x => { this.completed = true; _reject(x);  }
    process.env.Komandi_Debug && process.on('exit', () => {
      if (!this.completed) console.warn(`\nUnresolved deferred:\n${this.stack}`)
    })
    Object.defineProperty(this, 'resolve', { enumerable: false })
    Object.defineProperty(this, 'reject',  { enumerable: false })
  }
  /** Some magic CC BY-SA 4.0 https://stackoverflow.com/a/60328122 */
  static get [Symbol.species]() { return Promise; }
  /** More magic */
  get [Symbol.toStringTag]() { return 'Deferred' }
}

/** A lazily evaluated variant of Promise. */
export class Lazy<X> extends Deferred<X> {
  /** The function that is called to provide the value. */
  resolver: ()=>X|PromiseLike<X>
  /** Whether the resolver has already been called. */
  started:  boolean = false
  /** Create a lazily evaluated promise. */
  constructor (resolver: ()=>X|PromiseLike<X>) {
    super()
    this.resolver = resolver
    Object.defineProperty(this, 'resolver', { enumerable: false, writable: true })
  }
  /** @returns Promise */
  then <Y, Z> (
    resolved?: ((result: X)   => Y | PromiseLike<Y>) | null,
    rejected?: ((reason: any) => Z | PromiseLike<Z>) | null
  ): Promise<Y|Z> {
    if (!this.started) {
      this.started = true
      setImmediate(()=>Promise.resolve(this.resolver())
        .then(value=>this.resolve(value))
        .catch(e=>{
          if (e instanceof Error) e.stack += this.stack
          this.reject(e)
        }))
    }
    return super.then(resolved, rejected)
  }

  get [Symbol.toStringTag]() { return 'Lazy' }
  /** Equivalent to Promise.all but also lazily evaluated. */
  static all = (lazies: Promise<unknown>[]) => new Lazy(()=>Promise.all(lazies))
}

export type TaskCallback<X> = ()=>X|PromiseLike<X>|Promise<X>

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
    let cb:      TaskCallback<X> = () => { throw new Error('Task: no callback specified') }
    let context: C
    if (typeof args[0] === 'string') {
      [name, cb, context] = args as [string, TaskCallback<X>, C]
      if (!cb.name) Object.defineProperty(cb, 'name', { value: `[${name}]` })
    } else {
      [cb, context] = args as [TaskCallback<X>, C]
      name = cb.name
    }
    super(async () => {
      this.log.log('Task:    ', bold(name))
      return await Promise.resolve(this.cb!.bind(this.context)())
    })
    this.name     = name
    this.cb       = cb
    this.context  = context
    this.log      = (context as any)?.log ?? this.log
    Object.defineProperty(this, 'log', { enumerable: false, writable: true })
    Object.defineProperty(this, 'name', { enumerable: false, writable: true })
    Object.defineProperty(this, 'started', { enumerable: false, writable: true })
    Object.defineProperty(this, 'completed', { enumerable: false, writable: true })
  }

  get [Symbol.toStringTag]() {
    return (this.started?'started':this.completed?'done':'pending') +
      ': ' + (this.name??this.cb?.name??'?')
  }

  /** Define a subtask
    * @returns A Lazy or Promise containing a task. */
  task <T> (name: string, cb: (this: Task<C, X>)=>Promise<T>): Task<Task<C, X>, T> {
    const task = new Task(name, cb, this)
    const [_, head, ...body] = (task.stack ?? '').split('\n')
    task.stack = '\n' + head + '\n' + body.slice(3).join('\n')
    return task
  }

  static get [Symbol.species]() { return Promise; }

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
      return null as unknown as T
    }
    const [command, ...args] = this.parse(argv)
    if (command) {
      await this.before(context)
      return await command.run(args, context) as T
    } else {
      this.log.usage(this)
      throw new Error(`Invalid invocation: "${argv.join(' ')}"`)
    }
  }

  before = async (context: any = this): Promise<void> => {}

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
    columns.sub  += 3

    // Display
    const commands = Object.entries(commandTree)
    if (commands.length > 0) {
      this.br()
      for (let [name, entry] of Object.entries(commandTree)) {
        name = bold(name.padEnd(columns.name))
        let sub = ''
        if ((entry as any).commandTree) {
          const keys = Object.keys((entry as any).commandTree)?.length ?? 0
          sub = `(+${keys})`
        }
        sub = sub.padStart(columns.sub).padEnd(columns.sub + 1)
        this.info(`${name} ${sub} ${entry.description}`)
      }
      this.br()
    } else {
      this.info(`${name} exposes no commands.`)
    }
  }

  commandEnded (command: Command<any>) {
    const result = command.failed ? colors.red('failed') : colors.green('completed')
    const took   = command.took
    const method = command.failed ? this.error : this.log
    method(`The command "${bold(command.name)}" ${result} in ${command.took}`)
    for (const step of command.steps) {
      const name     = (step.name ?? '(nameless step)').padEnd(40)
      const status   = step.failed ? `${colors.red('fail')}` : `${colors.green('ok  ')}`
      const timing   = (step.took ?? '').padStart(10)
      method(status, bold(name), timing, 's')
    }
  }

}
