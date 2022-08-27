const colors = require('colors')
const { bold, red, green, yellow, magenta, inverse } = colors
const { render } = require('prettyjson')
const { prompts } = require('prompts')
const { table } = require('table')
const { cwd } = require('process')
const { relative } = require('path')
const { fileURLToPath } = require('url')

let maxContextLength = 0

function Callable (callback = function EmptyCallable () {}) {
  return function CallableObjectConstructor (...args) {
    return Object.setPrototypeOf(
      Call.bind(this),
      Object.getPrototypeOf(this)
    )
    function Call (...args) {
      console.log('Called', this)
      return this
    }
  }
}

module.exports.CustomConsole = class CustomConsole extends Callable(function Print (...args) {
  this.info(...args)
}) {

  constructor (name, console) {
    this.console = console
    this.padLength = Math.max(maxContextLength, name.length)
    this.prefixes = {
      info:  bold(green(  `${context.padEnd(maxContextLength)} INFO `)),
      warn:  bold(yellow( `${context.padEnd(maxContextLength)} WARN `)),
      error: bold(red(    `${context.padEnd(maxContextLength)} ERROR`)),
      trace: bold(magenta(`${context.padEnd(maxContextLength)} TRACE`))
    }
  }

  padLength = 0

  format = (arg) => {
    if (typeof arg === 'object') {
      return `${indent()}${render(arg).replace(/\n/g, indent())}`.trim()
    } else {
      return `${indent()}${String(arg)}`
    }
    function indent (n = this.padLength + 7) {
      return "\n" + [...Array(n)].map(x=>' ').join('')
    }
  }

  console = console

  info    = (...args) => this.console.info(this.prefixes.info,  ...args)

  warn    = (...args) => this.console.warn(this.prefixes.warn,  ...args)

  error   = (...args) => this.console.error(this.prefixes.error, ...args)

  debugEnabled = process.env.DEBUG

  debug = (...args) => {
    if (this.debugEnabled) {
      this.console.debug(args.map(format).join('').slice(1))
    }
    return args[0]
  }

  trace = (...args) => {
    if (this.debugEnabled) {
      this.console.debug(this.prefixes.trace, ...args.map(format))
      this.console.trace()
    }
    return args[0]
  }

  table = (rows = []) => this.console.log(table(rows))

}

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

module.exports         = Konzola
module.exports.default = Konzola
module.exports.Console = Konzola
module.exports.Konzola = Konzola
module.exports.colors  = colors
module.exports.bold    = colors.bold
module.exports.render  = render
module.exports.prompts = prompts
module.exports.table   = table

module.exports.timestamp = function timestamp (d = new Date()) {
  return d.toISOString()
    .replace(/[-:\.Z]/g, '')
    .replace(/[T]/g, '_')
    .slice(0, -3)
}
