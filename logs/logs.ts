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
  indent: number
  parent: Console | typeof console
}

export class Console extends defineCallable(
  function print (...args: any[]) {
    this.log(...args)
  }
) {

  label:  ConsoleOptions["label"]

  indent: ConsoleOptions["indent"]

  parent: Console | typeof console

  prefixes = {
    log:   this.definePrefix('   LOG │', x => chalk.bold(chalk.green(x))),
    info:  this.definePrefix('  INFO │', x => chalk.bold(chalk.blue(x))),
    warn:  this.definePrefix('  WARN │', x => chalk.bold(chalk.yellow(x))),
    error: this.definePrefix(' ERROR │', x => chalk.bold(chalk.red(x))),
    debug: this.definePrefix(' DEBUG │', x => chalk.bold(chalk.gray(x))),
    trace: this.definePrefix(' TRACE │', x => chalk.bold(chalk.magenta(x))),
    table: this.definePrefix(' TABLE │', x => chalk.bold(chalk.cyan(x))),
  }

  constructor (label?: string, options: Partial<ConsoleOptions> = {}) {
    super()
    this.label  = options.label  ?? ''
    this.indent = options.indent ?? 0
    this.parent = options.parent ?? console
    this.updateIndent(this.label)
    hideProperties(this, 'prefixes')
  }

  definePrefix (prefix: string, format: (text: string) => string): () => string {
    return () => {
      const indent = this.updateIndent(prefix)
      return format(`${prefix} ${this.label.padEnd(indent)} │`)
    }
  }

  updateIndent (str: string = ''): number {
    if (this.parent instanceof Console) {
      this.parent.updateIndent(this.label)
    }
    return this.indent = Math.max(this.indent, str.length)
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
}
