import { defineCallable } from '@hackbg/allo'

import * as chalk from 'chalk'
import { bold } from 'chalk'
export { chalk as colors, bold }

export function timestamp (d?: Date): string

type ConsoleOptions = {
  label:  string
  parent: Console | typeof console
}

export class Console extends defineCallable((...args: any) => Console) {
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

export class Logged {
  log: Console
  constructor (properties?: Partial<Logged>)
}

export function randomColor(options?: RandomColorOptionsSingle): string;
export function randomColor(options?: RandomColorOptionsMultiple): string[];

interface RandomColorOptionsSingle {
    hue?: number | string | undefined;
    luminosity?: "bright" | "light" | "dark" | "random" | undefined;
    seed?: number | string | undefined;
    format?: "hsvArray" | "hslArray" | "hsl" | "hsla" | "rgbArray" | "rgb" | "rgba" | "hex" | undefined;
    alpha?: number | undefined;
}

interface RandomColorOptionsMultiple extends RandomColorOptionsSingle {
    count: number;
}
