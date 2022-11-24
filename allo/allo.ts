type Class<T> = new (...args: any[]) => T

/** Define a callable class. Instances of the generated class can be invoked as functions.
  * The body of the function is passed as second argument.
  * The function's `this` identifier is bound to the instance.
  * @returns a callable class extending `Base`. */
export function defineCallable <T, U extends T, F extends Function> (
  Base: Class<T>,
  fn:   F
): Class<T> & F {
  return Object.defineProperty(class extends (Base as any) {
    constructor (...args: any) {
      super(...args)
      const self = this
      const objectPrototype = Object.getPrototypeOf(self)
      let call = function (...args: any) { return fn.apply(call, args) }
      Object.defineProperty(call, 'name', { value: fn.name })
      const functionPrototype = Object.getPrototypeOf(call)
      const newPrototype = {}
      Object.defineProperties(newPrototype, Object.getOwnPropertyDescriptors(functionPrototype))
      Object.setPrototypeOf(newPrototype, objectPrototype)
      Object.setPrototypeOf(call, newPrototype)
      Object.defineProperties(call, Object.getOwnPropertyDescriptors(self))
      return call as T
    }
  }, 'name', { value: `${Base.name}Callable` }) as Class<T> & F
}
