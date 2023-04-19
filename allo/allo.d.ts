/** Define a callable class. Instances of the generated class can be invoked as functions.
  * The body of the function is passed as second argument.
  * The function's `this` identifier is bound to the instance.
  * @returns a callable class extending `Base`. */
export function defineCallable <
  F extends Function,
  A extends unknown[],
  T,
  U extends T
> (
  /** The function that will be invoked when calling the instance. */
  fn: F,
  /** The base class to be made callable. */
  Base?: Class<A, T>
):
  Class<A, U & F>

type Class<A extends unknown[], T> =
  new (...args: A) => T

export function rebind (target: object, source: object):
  typeof target
