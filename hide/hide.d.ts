/** Hide properties by redefining them as non-enumerable.
  * @returns the first argument */
export function hideProperties <T> (self: T, ...keys: string[]): T
