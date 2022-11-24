import { Console, bold } from '@hackbg/logs'

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

  log: Console = new Console(this.constructor.name)

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
      this.log('Task:    ', bold(name))
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
