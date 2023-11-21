declare module "@hackbg/dome" {
  export function select (selector: string): NodeList

  export function selectAll (selector: string): NodeList

  export function frag (...nodes: Node[]): DocumentFragment

  export function render <H extends HTMLElement> (name: string, ...args: any): H
  export function render (name: 'a',        ...args: any): HTMLAnchorElement
  export function render (name: 'div',      ...args: any): HTMLDivElement
  export function render (name: 'select',   ...args: any): HTMLSelectElement
  export function render (name: 'input',    ...args: any): HTMLInputElement
  export function render (name: 'textarea', ...args: any): HTMLTextAreaElement
  export function render (name: 'img',      ...args: any): HTMLImageElement

  export function bind <H extends HTMLElement> (
    element: HTMLElement, events: Record<string, Function>
  ): H

  export function replace <H extends HTMLElement> (node: Element, newnode: H): H

  export function append <H extends HTMLElement> (node: H, ...nodes: Element[]): H
}
