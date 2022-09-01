let globalMaxIndent = 0

export class CustomConsole {

  constructor (console, name) {
    this.console = console
    this.name ??= name
    this.indent = Math.max(globalMaxIndent, this.name.length)
    const prefix = (text, style) => () => [`%c${this.name.padEnd(globalMaxIndent)} ${text}`, style]
    this.prefixes = {
      log:   prefix('LOG  ', 'font-weight:bold'),
      info:  prefix('INFO ', 'font-weight:bold'),
      warn:  prefix('WARN ', 'font-weight:bold'),
      error: prefix('ERROR', 'font-weight:bold'),
      trace: prefix('TRACE', 'font-weight:bold')
    }
  }

  console = console

  name = ''

  align = 0

  format = (arg) => arg

  log     = (...args) => this.console.log(this.prefixes.log(),   ...args)

  info    = (...args) => this.console.info(this.prefixes.info(),  ...args)

  warn    = (...args) => this.console.warn(this.prefixes.warn(),  ...args)

  error   = (...args) => this.console.error(this.prefixes.error(), ...args)

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

  table = (rows = []) => this.console.table(rows)

}

export function timestamp (d = new Date()) {
  return d.toISOString()
    .replace(/[-:\.Z]/g, '')
    .replace(/[T]/g, '_')
    .slice(0, -3)
}

export const bold = x => x
