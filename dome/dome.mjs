export class Dome extends function _Dome (root) {

  return function DOMFactory (type = 'div', ...args) {
    const node = (root.createElement||globalThis.document).createElement(type)
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
}

export default new Dome(globalThis.document)
