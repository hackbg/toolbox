# @hackbg/atom

```javascript
import atom from '@hackbg/atom'
```

The formatter is shared between all instances of an atom.
It generates the canonical representation of a value.

```javascript
const fmt1 = x=>`${x||0} bottles of beer on the wall`
```

Calling the `atom` function will create an atom:
a "callable object" (a.k.a. "JS function with custom properties"),
representing an observable value that can have one or more
display representations (instances).

```javascript
const foo = atom(fmt1)
```

You can access the atom's value using the `get` and `set` methods:

```javascript
foo.get() === undefined
foo.set(99).get() === 99
```

Calling an atom with no arguments returns the formatted value:

```javascript
foo() === `99 bottles of beer on the wall`
```

The formatter can be changed at runtime:

```javascript
const bar = atom(fmt1)
bar.set(99)
bar() === `99 bottles of beer on the wall`
bar.format = (current, previous) =>
  `${current.bottles} bottles of beer on the wall`
    + ((previous?.bottles) ? ` (was ${previous.bottles})` : '')
bar.set({ bottles: 98 })
bar() === `98 bottles of beer on the wall`
bar.set({ bottles: 97 })
bar() === `97 bottles of beer on the wall (was 98)`
```

When setting an atom's value, if the new value is not equal to the old,
setting the value calls `update`, which updates all displayed instances of the value.
When the value of an atom is an object and you make deep changes to it,
the new value remains equal to the old value, so you need to call
`update`:

```javascript
bar.get().bottles -= 2
bar.update()
```

Calling an atom with one argument (the render function)
creates a new instance of the atom.

The render function of an instance takes the formatted value and returns a final
rendered representation, e.g. a DOM element.

An instance is a display representation of an atom.
There can be multiple instances of each atom.

```javascript
const bar1 = bar(y => `[ ${y.split('(')[0]} ]`)
const bar2 = bar(y => `{ ${y.split('(')[0]} }`)
bar1.rendered === `[ 95 bottles of beer on the wall ]`
bar2.rendered === `{ 95 bottles of beer on the wall }`
bar.set({ bottles: 94 })
bar1.rendered === `[ 94 bottles of beer on the wall ]`
bar2.rendered === `{ 94 bottles of beer on the wall }`
```

Upon creation, each instance is added to the atom's private instance collection.
This way, when the atom's value is changed, it knows to re-render all its instances.

```javascript
bar2.detach() === bar2
bar.set({ bottles: 93 })
bar1.rendered === `[ 93 bottles of beer on the wall ]`
bar2.rendered === `{ 94 bottles of beer on the wall }`
bar.set({ bottles: 92 })
bar1.rendered === `[ 92 bottles of beer on the wall ]`
bar2.rendered === `{ 94 bottles of beer on the wall }`
```

Instance renderers can also be changed at runtime:

```javascript
const oldRenderer = bar2.renderer
bar2.renderer = (...args) => `STOPPED: ${oldRenderer(...args)`
bar2.update().rendered === `STOPPED: { 94 bottles of beer on the wall }`
```

Calling an instance's `update` method re-renders that instance
and returns the rendered value (e.g. the root of the rendered DOM component).

```javascript
```
