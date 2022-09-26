const colors = require('colors')
const { bold, red, green, yellow, magenta, blue, inverse } = colors
const { render } = require('prettyjson')
const { prompts } = require('prompts')
const { table } = require('table')
const { cwd } = require('process')
const { relative } = require('path')
const { fileURLToPath } = require('url')

module.exports.CustomConsole = class CustomConsole {

  static indent = 0

  static updateIndent = (str='') => this.indent = Math.max(this.indent, str.length)

  constructor (name = '', _console = console) {
    this.name = name || this.name
    this.console = _console
    this.constructor.updateIndent(name)
    const prefix = (text, color) => () => {
      const indent = this.constructor.updateIndent(name)
      return bold(color(`${text} ${this.name.padEnd(indent)} │`))
    }
    this.prefixes = {
      log:   prefix('   LOG │', blue),
      info:  prefix('  INFO │', green),
      warn:  prefix('  WARN │', yellow),
      error: prefix(' ERROR │', red),
      trace: prefix(' TRACE │', magenta)
    }
    Object.defineProperty(this, 'prefixes', { enumerable: false, writable: true })
    Object.defineProperty(this, 'console',  { enumerable: false, writable: true })
  }

  console = console

  name = ''

  log   = (...args) => this.console.log(this.prefixes.log(),   ...args)

  info  = (...args) => this.console.info(this.prefixes.info(),  ...args)

  warn  = (...args) => this.console.warn(this.prefixes.warn(),  ...args)

  error = (...args) => this.console.error(this.prefixes.error(), ...args)

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

  format = (arg) => {
    const indented = (n = CustomConsole.indent + 7) => {
      return "\n" + [...Array(n)].map(x=>' ').join('')
    }
    if (typeof arg === 'object') {
      return `${indented()}${render(arg).replace(/\n/g, indented())}`.trim()
    } else {
      return `${indented()}${String(arg)}`
    }
  }

  table = (rows = []) => this.console.log(table(rows))

  br = () => this.console.log()

}

module.exports.timestamp = function timestamp (d = new Date()) {
  return d.toISOString()
    .replace(/[-:\.Z]/g, '')
    .replace(/[T]/g, '_')
    .slice(0, -3)
}

module.exports.bold = x => colors.bold(String(x))

module.exports.CustomError = class CustomError extends Error {
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

module.exports.colors = colors

module.exports.render = render

module.exports.prompts = prompts

module.exports.table = table
