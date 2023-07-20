module.exports = { defineCallable, rebind }

function defineCallable (fn, Base = class {}) {
  return Object.defineProperty(class extends Base {
    constructor (...args) {
      super(...args)
      const objectPrototype = Object.getPrototypeOf(this)
      let call = function (...args) {
        return fn.apply(call, args)
      }
      setName(this.name)
      function setName (name) {
        Object.defineProperty(call, 'name', {
          get () { return name },
          set (name) { setName(name) }
        })
      }
      const functionPrototype = Object.getPrototypeOf(call)
      const newPrototype = {}
      Object.defineProperties(newPrototype, Object.getOwnPropertyDescriptors(functionPrototype))
      Object.setPrototypeOf(newPrototype, objectPrototype)
      Object.setPrototypeOf(call, newPrototype)
      Object.defineProperties(call, Object.getOwnPropertyDescriptors(this))
      return call
    }
  }, 'name', { value: `${Base.name}Callable` })
}

function rebind (target, source) {
  // if target is a function make its name writable
  if ('name' in source) Object.defineProperty(target, 'name', { writable: true })
  // copy properties
  for (let key in source) Object.assign(target, { [key]: source[key] })
  // copy prototype
  Object.setPrototypeOf(target, Object.getPrototypeOf(source))
  return target
}
