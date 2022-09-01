const colors = require('colors')
const { bold, red, green, yellow, magenta, blue, inverse } = colors
const { render } = require('prettyjson')
const { prompts } = require('prompts')
const { table } = require('table')
const { cwd } = require('process')
const { relative } = require('path')
const { fileURLToPath } = require('url')

let globalMaxIndent = 0



function Konzola (context) {

  maxContextLength = Math.max(maxContextLength, context.length)

  const INFO  = () => bold(green(  `${context.padEnd(maxContextLength)} INFO `))
  const WARN  = () => bold(yellow( `${context.padEnd(maxContextLength)} WARN `))
  const ERROR = () => bold(red(    `${context.padEnd(maxContextLength)} ERROR`))
  const TRACE = () => bold(magenta(`${context.padEnd(maxContextLength)} TRACE`))

  const INDENT = (n = maxContextLength+7) => "\n" + [...Array(n)].map(x=>' ').join('')
  const format = (arg) => {
    if (typeof arg === 'object') {
      return INDENT() + render(arg).replace(/\n/g, INDENT()).trim()
    } else {
      return INDENT() + String(arg)
    }
  }

  const log = (...args) => console.log(...args)

  return Object.assign(log, {
    log,
    info:  (...args) => console.info( INFO(),  ...args),
    warn:  (...args) => console.warn( WARN(),  ...args),
    error: (...args) => console.error(ERROR(), ...args),
    trace: (...args) => {
      console.debug(bold(magenta('TRACE')), ...args.map(format))
      console.trace()
    },
    debug: (...args) => {
      if (!process.env.NO_DEBUG) {
        console.debug(args.map(format).join('').slice(1))
      }
      return args[0]
    },
    table: (rows = []) => console.log(table(rows)),
    format,
  })

}

function timestamp (d = new Date()) {
  return d.toISOString()
    .replace(/[-:\.Z]/g, '')
    .replace(/[T]/g, '_')
    .slice(0, -3)
}

module.exports.colors    = colors
module.exports.bold      = colors.bold
module.exports.render    = render
module.exports.prompts   = prompts
module.exports.table     = table
module.exports.timestamp = timestamp

module.exports.CustomConsole = class CustomConsole {

  constructor (console, name) {
    this.console  = console
    this.name     = name
    this.indent   = Math.max(globalMaxIndent, (this.name||'').length)
    const prefix  = (text, color) => () => bold(color(`${this.name.padEnd(this.indent)} ${text}`))
    this.prefixes = {
      log:   prefix('LOG  ', blue),
      info:  prefix('INFO ', green),
      warn:  prefix('WARN ', yellow),
      error: prefix('ERROR', red),
      trace: prefix('TRACE', magenta)
    }
    Object.defineProperty(this, 'prefixes', { enumerable: false, writable: true })
    Object.defineProperty(this, 'console',  { enumerable: false, writable: true })
  }

  console = console

  name    = ''

  indent  = 0

  format = (arg) => {
    const indented = (n = this.indent + 7) => {
      return "\n" + [...Array(n)].map(x=>' ').join('')
    }
    if (typeof arg === 'object') {
      return `${indented()}${render(arg).replace(/\n/g, indented())}`.trim()
    } else {
      return `${indented()}${String(arg)}`
    }
  }

  log     = (...args) => this.console.log(this.prefixes.log(),   ...args)

  info    = (...args) => this.console.info(this.prefixes.info(),  ...args)

  warn    = (...args) => this.console.warn(this.prefixes.warn(),  ...args)

  error   = (...args) => this.console.error(this.prefixes.error(), ...args)

  debugEnabled = process.env.DEBUG || false

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

  table = (rows = []) => this.console.log(table(rows))

}

module.exports.CustomError = class CustomError extends Error {
  static define (name, message) {
    const CustomError = class extends this { constructor (...args) { super(message(args)) } }
    Object.defineProperty(CustomError, 'name', { value: `${name}Error` })
    return CustomError
  }
}
