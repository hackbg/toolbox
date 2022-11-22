export class CustomConsole {

  static indent = 0

  static updateIndent = (str='') => this.indent = Math.max(this.indent, str.length)

  constructor (name = '', _console = console) {
    this.name ??= name
    this.console = _console
    this.constructor.updateIndent(name)
    const prefix = (text, style) => () => {
      const indent = this.constructor.updateIndent(name)
      return [`%c${text} ${this.name.padEnd(CustomConsole.indent)}\n`, style]
    }
    this.prefixes = {
      log:   prefix('LOG  ', 'font-weight:bold'),
      info:  prefix('INFO ', 'font-weight:bold'),
      warn:  prefix('WARN ', 'font-weight:bold'),
      error: prefix('ERROR', 'font-weight:bold'),
      trace: prefix('TRACE', 'font-weight:bold')
    }
  }

  get indent () {
    return this.constructor.indent
  }

  get width () {
    return Infinity
  }

  console = console

  log   = (...args) => this.console.log(...this.prefixes.log(),   ...args)

  info  = (...args) => this.console.info(...this.prefixes.info(),  ...args)

  warn  = (...args) => this.console.warn(...this.prefixes.warn(),  ...args)

  error = (...args) => this.console.error(...this.prefixes.error(), ...args)

  debugEnabled = true

  debug = (...args) => {
    if (this.debugEnabled) {
      this.console.debug(args.map(this.format).join('').slice(1))
    }
    return args[0]
  }

  trace = (...args) => {
    if (this.debugEnabled) {
      this.console.debug(this.prefixes.trace(), ...args.map(this.format))
      this.console.trace()
    }
    return args[0]
  }

  format = (arg) => arg

  table = (rows = []) => this.console.table(rows)

  br = () => this.console.log()

}

export function timestamp (d = new Date()) {
  return d.toISOString()
    .replace(/[-:\.Z]/g, '')
    .replace(/[T]/g, '_')
    .slice(0, -3)
}

export const bold = x => String(x)

export class CustomError extends Error {
  static define (name, getMessage = () => '') {
    const fullName = `${name}${this.name}`
    return Object.defineProperty(class CustomError extends this {
      constructor (...args) {
        const message = getMessage(...args)
        super(message)
      }
      name = fullName
    }, 'name', { value: fullName })
  }
}

import * as colors from 'colors'
export { colors }
