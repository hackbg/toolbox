/** Create an observable value with multiple simultaneous representations. */
// e.g.:
//   import atom from '@hackbg/atom'
//   const foo = atom(x=>`${x||0} bottles of beer on the wall`)
export default function createAtom (
  // The formatter is shared between all instances of an atom.
  // It generates the canonical representation of a value.
  formatter = (value, previous) => value
) {
  // An atom can be displayed multiple times on the screen.
  // Each instance of the atom is collected here.
  const instances = new Set() 
  // The reference to the atom's current value is kept private.
  // You can access the value using the `get` and `set` methods:
  // e.g.:
  //   foo.get() === undefined
  //   foo.set(99).get() === 99
  //   foo() === `99 bottles of beer on the wall`
  let value
  atom.get = () => value
  // If the new value is not equal to the old,
  // setting the value calls atom.update(), which
  // updates all displayed instances of the value.
  atom.set = (newval) => {
    if (value !== newval) {
      value = newval
      atom.update()
    }
    return atom
  }
  // The formatter can be changed at runtime.
  // e.g.:
  //   const bar = atom()
  //   bar.formatter = (current, previous) =>
  //     `${current.bottles} bottles of beer on the wall`
  //     + (previous ? ` (was ${previous.bottles})` : '')
  //   bar.set({ bottles: 98 })
  //   bar() === `98 bottles of beer on the wall`
  //   bar.set({ bottles: 97 })
  //   bar() === `97 bottles of beer on the wall (was 98)`
  atom.formatter = formatter
  // When the value is an object and you make deep changes to it,
  // call the atom.update method directly,
  // e.g.:
  //   bar.get().bottles -= 2
  //   bar.update()
  atom.update = () => {
    instances.forEach(instance=>instance.update())
    return atom
  }
  return atom
  // An atom is "a callable object", a.k.a. "a function with custom properties".
  function atom (...args) {
    // Calling an atom with no arguments returns the formatted value.
    // e.g.:
    //   bar() === `95 bottles of beer on the wall (was 97)`
    if (args.length === 0) return atom.formatter(value)
    // Calling an atom with one or more arguments returns an instance.
    const [renderer = x => x.toString()] = args
    // An instance is a display representation of an atom.
    // There can be multiple instances of each atom.
    // e.g.:
    //   const bar1 = bar(y => `[ ${y.split('(')[0]} ]`)
    //   const bar2 = bar(y => `{ ${y.split('(')[0]} }`)
    //   bar1.rendered === `[ 95 bottles of beer on the wall ]`
    //   bar2.rendered === `{ 95 bottles of beer on the wall }`
    //   bar.set({ bottles: 94 })
    //   bar1.rendered === `[ 94 bottles of beer on the wall ]`
    //   bar2.rendered === `{ 94 bottles of beer on the wall }`
    const instance = { rendered: null }
    // Each instance is added to the atom's instance set upon creation.
    instances.add(instance)
    // To cease updates from the atom to a particular instance, use the
    // instance.detach() method,
    // e.g.:
    //   bar2.detach() === bar2
    //   bar.set({ bottles: 93 })
    //   bar1.rendered === `[ 93 bottles of beer on the wall ]`
    //   bar2.rendered === `{ 94 bottles of beer on the wall }`
    //   bar.set({ bottles: 92 })
    //   bar1.rendered === `[ 92 bottles of beer on the wall ]`
    //   bar2.rendered === `{ 94 bottles of beer on the wall }`
    instance.detach = () => {
      instances.remove(instance)
      return instance
    }
    // Instance renderers can also be changed at runtime,
    // e.g.:
    //   const oldRenderer = bar2.renderer
    //   bar2.renderer = (...args) => `STOPPED: ${oldRenderer(...args)`
    //   bar2.update().rendered === `STOPPED: { 94 bottles of beer on the wall }`
    instance.renderer = renderer
    // Calling the `update()` method re-renders the instance
    // with the current formatted value of the atom, and returns
    // the rendered value.
    instance.update = () => {
      const formatted = atom.formatter(value, previous)
      const rendered  = instance.renderer(formatted, instance.rendered)
      if (instance.rendered && instance.rendered !== rendered) {
        this.replace(instance.rendered, rendered)
        instance.rendered = rendered
      }
      return instance.rendered
    }
    return instance
  }
}
