/** ender some S-expressions into DOM nodes. */
export function render (selector = 'div', ...args) {
  const [type, ...classes] = selector.split('.')
  const node = globalThis.document.createElement(type||'div')
  for (const arg of args) {
    if (arg instanceof Array) {
      node.appendChild(render(...arg))
    } else if (arg instanceof Node) {
      node.appendChild(arg)
    } else if (arg && typeof arg==='object' && Object.getPrototypeOf(arg)===Object.getPrototypeOf({})) {
      for (const key in arg) Object.assign(node, arg)
    } else if (arg) {
      node.appendChild(new Text(arg.toString()))
    }
  }
  for (const className of classes) {
    node.classList.add(className)
  }
  return node
}

/** Get an element by id or throw */
export const id = id => {
  const result = globalThis.document.getElementById(id)
  if (!result) throw Object.assign(new Error(`failed to get element by id ${id}`), { id })
  return result
}

/** Get the first node that matches a CSS selector. */
export const select = (selector) => globalThis.document.querySelector(selector)

/** Get all nodes that match a CSS selector. */
export const selectAll = (selector) => globalThis.document.querySelectorAll(selector)

/** Replace a node in place. */
export const replace = (node, newnode) => {
  node.parentElement?.replaceChild(newnode, node)
  return newnode
}

/** Append one more nodes to a parent node. Return the parent. */
export const append = (node, ...nodes) => {
  nodes.forEach(n=>node.appendChild(n))
  return node
}

/** Create a new DocumentFragment with the passed nodes. */
export const frag = (...nodes) => append(new DocumentFragment(), ...nodes)

/** Bind one or more event handlers to a target; return the target. */
export const bind = (element, events = {}) => {
  for (const [event, handler] of Object.entries(events)) {
    element.addEventListener(event, handler)
  }
  return element
}

