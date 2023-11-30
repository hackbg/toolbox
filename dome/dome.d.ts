declare module "@hackbg/dome" {
  export function select (selector: string): NodeList

  export function selectAll (selector: string): NodeList

  export function frag (...nodes: Node[]): DocumentFragment

  export function render <H extends HTMLElement> (name: string, ...args: any): H

  export function bind <H extends HTMLElement> (
    element: HTMLElement, events: Record<string, Function>
  ): H

  export function replace <H extends HTMLElement> (node: Element, newnode: H): H

  export function append <H extends HTMLElement> (node: H,
    ...nodes: (Element|Parameters<typeof render>)[]): H
}
