type Class<A extends unknown[], T> = new (...args: A) => T

/** Define a callable class. Instances of the generated class can be invoked as functions.
  * The body of the function is passed as second argument.
  * The function's `this` identifier is bound to the instance.
  * @returns a callable class extending `Base`. */
export function defineCallable <F extends Function, A extends unknown[], T, U extends T> (
  /** The function that will be invoked when calling the instance. */
  fn:   F,
  /** The base class to be made callable. */
  Base: Class<A, T> = class {} as Class<A, T>,
): Class<A, U & F> {
  return Object.defineProperty(class extends (Base as any) {
    constructor (...args: A) {
      super(...args)
      const objectPrototype = Object.getPrototypeOf(this)
      let call = function (...args: any) { return fn.apply(call, args) }
      Object.defineProperty(call, 'name', { value: fn.name })
      const functionPrototype = Object.getPrototypeOf(call)
      const newPrototype = {}
      Object.defineProperties(newPrototype, Object.getOwnPropertyDescriptors(functionPrototype))
      Object.setPrototypeOf(newPrototype, objectPrototype)
      Object.setPrototypeOf(call, newPrototype)
      Object.defineProperties(call, Object.getOwnPropertyDescriptors(this))
      return call as unknown as U & F
    }
  }, 'name', { value: `${Base.name}Callable` }) as Class<A, U & F>
}
