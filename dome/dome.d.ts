declare function render (type: string, ...args: any): Node

declare class _Dome {
  constructor (root: any)
  id (id: string): Node
  select (selector: string): NodeList
  selectAll (selector: string): NodeList
  replace (node: Node, newnode: Node): typeof newnode
  append (node: Node, ...nodes: Node[]): typeof node
  frag (...nodes: Node[]): DocumentFragment
}

export type Dome = typeof render & _Dome

declare const $: Dome

export default $
