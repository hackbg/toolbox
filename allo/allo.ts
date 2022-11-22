/** A class constructor. */
export interface Class<T, U extends unknown[]> {
  new (...args: U): T
}

/** Define a callable class. Instances of the generated class can be invoked as functions.
  * The body of the function is passed as second argument.
  * The function's `this` identifier is bound to the instance.
  * @returns a callable class extending `Base`. */
export function defineCallable <T, U extends T, V extends unknown[], F extends Function> (
  Base: Class<any, any>,
  fn:   F
): Class<any, any> {
  return Object.defineProperty(class extends (Base as any) {
    constructor (...args: any) {
      super(...args)
      const self = this
      let call = function (...args: any) {
        return fn.apply(call, args)
      }
      let descriptors = {}
      let parent
      parent = call
      while (parent = Object.getPrototypeOf(parent)) {
        descriptors = { ...descriptors, ...Object.getOwnPropertyDescriptors(parent) }
      }
      parent = this
      while (parent = Object.getPrototypeOf(parent)) {
        descriptors = { ...descriptors, ...Object.getOwnPropertyDescriptors(parent) }
      }
      Object.setPrototypeOf(call, Object.defineProperties({}, descriptors))
      Object.defineProperties(call, Object.getOwnPropertyDescriptors(this))
      return call
    }
  }, 'name', {
    value: `${Base.name}Callable`
  }) as Class<U, V>
}
