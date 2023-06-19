export class Dome extends function _Dome (root) {

  return function DOMFactory (type = 'div', ...args) {
    const node = globalThis.document.createElement(type)
    for (const arg of args) {
      if (arg instanceof Array) {
        node.appendChild(DOMFactory(...arg))
      } else if (arg instanceof Node) {
        node.appendChild(arg)
      } else if (typeof arg==='object' && Object.getPrototypeOf(arg)===Object.getPrototypeOf({})) {
        for (const key in arg) Object.assign(node, arg)
      } else if (arg) {
        node.appendChild(new Text(arg.toString()))
      }
    }
    return node
  }

} {

  constructor (root) {
    super()
    this.root = root
  }

  /** Get an element by id or throw */
  id = id => {
    const result = this.root.getElementById(id)
    if (!result) throw Object.assign(new Error(`failed to get element by id ${id}`), { id })
    return result
  }
  /** Get the first node that matches a CSS selector. */
  select = (selector) => this.root.querySelector(selector)
  /** Get all nodes that match a CSS selector. */
  selectAll = (selector) => this.root.querySelectorAll(selector)
  /** Replace a node in place. */
  replace = (node, newnode) => {
    node.parentElement.replaceChild(newnode, node)
    return newnode
  }
  /** Append one more nodes to a parent node. Return the parent. */
  append = (node, ...nodes) => {
    nodes.forEach(n=>node.appendChild(n))
    return node
  }
  /** Create a new DocumentFragment with the passed nodes. */
  frag = (...nodes) =>
    append(new DocumentFragment(), ...nodes)
  events = (chain = undefined, t = new EventTarget()) => {
    let emit = (type, data={}) => (t.dispatchEvent(Object.assign(new Event(type), data)), chain||this),
        on   = (type, handler) => (t.addEventListener(type, handler), chain||this),
        off  = (type, handler) => (t.removeEventListener(type, handler), chain||this),
        once = (type, handler) => on(type, function onceHandler () { off(type, onceHandler); return handler(args) });
    return {emit, on, off, once}
  }
  atom = (formatter = (value, previous) => value) => {
    let value // private
    const instances = new Set()
    const get = () => value
    const set = v => (((value!==v)&&(value=v,update())),atom)
    const update = () => instances.forEach(instance=>instance.update())
    const inst = (renderer = renderText) => {
      const instSet = v => (set(v),instance)
      const render = (value, previous) => renderer(formatter(value, previous), instance.root)
      const update = (root = instance.render(instance.get(), instance.root)) => (
        (instance.root ? ((instance.root!==root)&&this.replace(instance.root, root)) : root),
        Object.assign(instance, {root}))
      const instance = { root: null, render, update, get, set: instSet }
      instances.add(instance)
      return instance.update().root
    }
    const atom = { get, set, inst, update }
    return atom
  }
}

export default new Dome(globalThis.document)
