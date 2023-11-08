module.exports = { hideProperties }

/** Hide properties by redefining them as non-enumerable.
  * @returns the first argument */
function hideProperties (self, ...keys) {
  for (const key of keys) {
    Object.defineProperty(self, key, {
      ...Object.getOwnPropertyDescriptor(self, key),
      enumerable: false
    })
  }
  return self
}
