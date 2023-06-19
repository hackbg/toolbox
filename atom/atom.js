/** Create an observable value with multiple display representations. */
export default function createAtom (format = (value, previous) => value) {
  const instances = new Set() 
  let value
  return Object.assign(function atom (...args) {
    if (args.length === 0) return atom.format(value)
    const [renderer = (x, previous) => x.toString()] = args
    if (typeof renderer !== 'function') throw new Error('instance renderer must be a function')
    const instance = {
      renderer,
      rendered: null,
      detach: () => {
        instances.remove(instance)
        return instance
      },
      update: () => {
        const formatted = atom.format(value, previous)
        const rendered = instance.renderer(formatted, instance.rendered)
        if (instance.rendered && instance.rendered !== rendered) {
          this.replace(instance.rendered, rendered)
          instance.rendered = rendered
        }
        return instance.rendered
      }
    }
    instances.add(instance)
    return instance
  }, {
    format,
    get: () => value,
    set: (newval) => {
      if (value !== newval) {
        value = newval
        atom.update()
      }
      return atom
    },
    update: () => {
      instances.forEach(instance=>instance.update())
      return atom
    },
  })
}
