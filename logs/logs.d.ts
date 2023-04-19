import { defineCallable } from '@hackbg/allo'

import * as chalk from 'chalk'
import { bold } from 'chalk'
export { chalk as colors, bold }

export function timestamp (d: Date): string

export interface IConsole {
  log   (...args: any)
  info  (...args: any)
  warn  (...args: any)
  error (...args: any)
  debug (...args: any)
  trace (...args: any)
  table (...args: any)
}

type ConsoleOptions = {
  label:  string
  parent: Console | typeof console
}

export class Console extends defineCallable(Function) implements IConsole {
  constructor (label?: string, options?: Partial<ConsoleOptions>)
  get [Symbol.toStringTag]()
  label:  string
  parent: Console | typeof console

  sub (label: string, options?: Partial<ConsoleOptions>)
  br ()
  log (...args: any): typeof args[0]
  info (...args: any): typeof args[0]
  warn (...args: any): typeof args[0]
  error (...args: any): typeof args[0]
  debug (...args: any): typeof args[0]
  trace (...args: any): typeof args[0]
  table (...args: any): typeof args[0]
}
