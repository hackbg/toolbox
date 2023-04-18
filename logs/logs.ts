import chalk from 'chalk'
import { defineCallable } from '@hackbg/allo'
import { hideProperties } from '@hackbg/hide'

export { chalk as colors }

export const bold = chalk.bold

export function timestamp (d = new Date()) {
  return d.toISOString()
    .replace(/[-:\.Z]/g, '')
    .replace(/[T]/g, '_')
    .slice(0, -3)
}

export interface Console {
  log   (...args: any): void
  info  (...args: any): void
  warn  (...args: any): void
  error (...args: any): void
  debug (...args: any): void
  trace (...args: any): void
  table (...args: any): void
}

export interface ConsoleOptions {
  label:  string
  parent: Console | typeof console
}

export class Console extends defineCallable(
  function print (this: Console, ...args: any[]) {
    this.log(...args)
  }
) {

  constructor (label?: string, options: Partial<ConsoleOptions> = {}) {
    super()
    this.label  = options.label  ?? label ?? ''
    this.parent = options.parent ?? console
    hideProperties(this, 'prefixes', 'parent')
  }

  get [Symbol.toStringTag]() {
    return this.label
  }

  label:  ConsoleOptions["label"]

  parent: Console | typeof console

  prefixes = {
    log:   this.definePrefix('  LOG ', x => chalk.inverse(chalk.green(x.slice(0, 6)))   + chalk.green(x.slice(6))),
    info:  this.definePrefix(' INFO ', x => chalk.inverse(chalk.blue(x.slice(0, 6)))    + chalk.blue(x.slice(6))),
    warn:  this.definePrefix(' WARN ', x => chalk.inverse(chalk.yellow(x.slice(0, 6)))  + chalk.yellow(x.slice(6))),
    error: this.definePrefix('ERROR ', x => chalk.inverse(chalk.red(x.slice(0, 6)))     + chalk.red(x.slice(6))),
    debug: this.definePrefix('DEBUG ', x => chalk.inverse(chalk.gray(x.slice(0, 6)))    + chalk.gray(x.slice(6))),
    trace: this.definePrefix('TRACE ', x => chalk.inverse(chalk.magenta(x.slice(0, 6))) + chalk.magenta(x.slice(6))),
    table: this.definePrefix('TABLE ', x => chalk.inverse(chalk.cyan(x.slice(0, 6)))    + chalk.cyan(x.slice(6))),
  }

  definePrefix (prefix: string, format: (text: string) => string): () => string {
    return () => format(`${prefix} ${this.label}`)
  }

  child (label: string, options: Partial<ConsoleOptions> = {}) {
    options.parent = this
    return new Console(label, options)
  }

  br () {
    this.parent.log()
  }

  log <T> (first: T, ...rest: any[]): T {
    this.parent.log(this.prefixes.log(), first, ...rest)
    return first
  }

  info <T> (first: T, ...rest: any[]): T {
    this.parent.info(this.prefixes.info(), first, ...rest)
    return first
  }

  warn <T> (first: T, ...rest: any[]): T {
    this.parent.warn(this.prefixes.warn(), first, ...rest)
    return first
  }

  error <T> (first: T, ...rest: any[]): T {
    this.parent.error(this.prefixes.error(), first, ...rest)
    return first
  }

  debug <T> (first: T, ...rest: any[]): T {
    this.parent.debug(this.prefixes.debug(), first, ...rest)
    return first
  }

  trace <T> (first: T, ...rest: any[]): T {
    this.parent.trace(this.prefixes.trace(), first, ...rest)
    return first
  }

  table <T> (first: T, ...rest: any[]): T {
    this.parent.table(this.prefixes.table(), first, ...rest)
    return first
  }

  get width () {
    return process.stdout.columns
  }

}
