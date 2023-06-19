export default function createAtom<T, U> (format: Formatter<T, U>): Atom<T, U>

export type AtomInstance<T, U, V> = {
  renderer:  Formatter<U, V>
  rendered:  V|null
  detach (): AtomInstance<T, U, V>
  update (): V|null
}

export type Formatter<T, U> = (value: T, previousResult: U) => U

export type Atom<T, U> = (<V>() => AtomInstance<T, U, V>) & {
  format:     Formatter<T, U>
  get ():     T
  set (t: T): Atom<T, U>
  update ():  Atom<T, U>
}

