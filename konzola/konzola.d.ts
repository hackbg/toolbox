declare module '@hackbg/konzola' {

  export { prompts } from 'prompts'
  export { render } from 'prettyjson'
  export { table } from 'table'
  export * as colors from 'colors'
  export const bold: (text: string)=>string

  export interface Console {
    log   (...args: any): void
    info  (...args: any): void
    warn  (...args: any): void
    error (...args: any): void
    debug (...args: any): void
    trace (...args: any): void
  }

  export class CustomConsole implements Console {
    constructor (host?: Console, name?: string)
    log   (...args: any): void
    info  (...args: any): void
    warn  (...args: any): void
    error (...args: any): void
    debug (...args: any): void
    trace (...args: any): void
  }

  export const timestamp: Function

}
