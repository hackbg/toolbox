import { defineCallable } from '@hackbg/allo'

import * as chalk from 'chalk'
import { bold } from 'chalk'
export { chalk as colors, bold }

export function timestamp (d?: Date): string

type ConsoleOptions = {
  label:  string
  parent: Console | typeof console
}

export class Console extends defineCallable(Function) {
  constructor (label?: string, options?: Partial<ConsoleOptions>)

  label: string
  parent: Console | typeof console

  log   (...args: any): this
  info  (...args: any): this
  warn  (...args: any): this
  error (...args: any): this
  debug (...args: any): this
  trace (...args: any): this
  table (...args: any): this

  sub (label: string, options?: Partial<ConsoleOptions>): this
  br (): this

  get [Symbol.toStringTag](): string
  get width (): number
}
