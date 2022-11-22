/** Hide properties by redefining them as non-enumerable.
  * @returns the first argument */
export function hideProperties <T> (self: T, ...keys: string[]): T {
  for (const key of keys) {
    Object.defineProperty(self, key, {
      ...Object.getOwnPropertyDescriptor(self, key),
      enumerable: false
    })
  }
  return self
}
