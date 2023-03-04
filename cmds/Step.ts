import { Timed } from '@hackbg/time'
import { Console } from '@hackbg/logs'

/** Run several operations in parallel in the same context. */
export function parallel (...operations: Function[]) {
  return function parallelOperations (context: { run: Function }) {
    return Promise.all(operations.map(command=>context.run(command)))
  }
}

/** A step is a value object around a function that takes context as first argument. */
export default class Step<C, D> extends Timed<D, Error> {

  constructor (
    public impl: StepFn<C, D>,
    public name = impl.name,
    public description?: string,
    public log: Console = new Console(`Step: ${name}`)
  ) {
    super()
    Object.defineProperty(this, 'log', { enumerable: false, writable: true })
  }

  /** - Always async.
    * - Bind "this" in impl.
    * @returns updated copy of context. */
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

export type StepFn<C, D> = (this: C, ...args: any[]) => D|Promise<D>

export type Steps<X> = (Step<X, unknown>|StepFn<X, unknown>)[]
