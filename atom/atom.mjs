/** Create an observable value with multiple display representations. */
export default function createAtom (format = (value, previous) => value) {

  const instances = new Set()

  let value

  return Object.assign(atom, {
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

  function atom (...args) {

    if (args.length === 0) return atom.format(value)

    const [renderer = (x, previous) => x.toString()] = args

    if (typeof renderer !== 'function') {
      throw new Error('@hackbg/atom: instance renderer must be a function')
    }

    let instance

    instances.add(instance = {

      renderer,

      rendered: null,

      detach: () => {
        instances.remove(instance)
        return instance
      },

      update: () => {
        const formatted = atom.format(value)
        const rendered = instance.renderer(formatted, instance.rendered)
        if (instance.rendered && instance.rendered !== rendered) {
          this.replace(instance.rendered, rendered)
          instance.rendered = rendered
        }
        return instance.rendered
      }

    })

    return instance

  }

}
