//@ts-check
const chalk = module.exports.colors = require('chalk')
const { defineCallable } = require('@hackbg/allo')
const { hideProperties } = require('@hackbg/hide')
//@ts-ignore
const bold = module.exports.bold = chalk.bold
const timestamp = module.exports.timestamp = function timestamp (d = new Date()) {
  return d.toISOString()
    .replace(/[-:\.Z]/g, '')
    .replace(/[T]/g, '_')
    .slice(0, -3)
}
const Console = module.exports.Console = class Console extends defineCallable(function log(...args){
  this.log(...args)
}) {
  constructor (label, options = {}) {
    super()
    this.label  = options.label  ?? label ?? ''
    this.parent = options.parent ?? console
    hideProperties(this,
      'label', 'tags', 'tag', '_tag', 'parent', 'sub',
      'br', 'log', 'info', 'warn', 'error', 'debug', 'trace', 'table', 
      '_print',
    )
  }
  label
  parent
  sub = (label, options = {}) => new SubConsole(label, { ...options, parent: this })
  br = () => { this.parent.log(); return this }
  log   = (...args) => this._print('log',   this._tag(chalk.green,   ' LOG   '), ...args)
  info  = (...args) => this._print('info',  this._tag(chalk.blue,    ' INFO  '), ...args)
  warn  = (...args) => this._print('warn',  this._tag(chalk.yellow,  ' WARN  '), ...args)
  error = (...args) => this._print('error', this._tag(chalk.red,     ' ERROR '), ...args)
  debug = (...args) => this._print('debug', this._tag(chalk.magenta, ' DEBUG '), ...args)
  trace = (...args) => this._print('log',   this._tag(chalk.magenta, ' TRACE '), ...args, '\n'+new Error().stack.split('\n').slice(2).join('\n'))
  table = (...args) => {
    this._print('log', this._tag(chalk.white,   'TABLE '));
    this._print('table', ...args)
  }
  _print = (method, tag, ...args) => {
    this.parent[method](tag, ...args);
    return this
  }
  _tag = (color, string) => {
    return (string ? (chalk.inverse(color(bold(string))) + ' ') : '') + color(this.label)
  }
  get [Symbol.toStringTag]() {
    return this.label
  }
  get width () {
    return process.stdout.columns
  }
}
class SubConsole extends Console {
  log   = (...args) => this._print('log',   this._tag(chalk.green),   ...args)
  info  = (...args) => this._print('info',  this._tag(chalk.blue),    ...args)
  warn  = (...args) => this._print('warn',  this._tag(chalk.yellow),  ...args)
  error = (...args) => this._print('error', this._tag(chalk.red),     ...args)
  debug = (...args) => this._print('debug', this._tag(chalk.magenta), ...args)
  trace = (...args) => this._print('trace', this._tag(chalk.magenta), ...args)
  table = (...args) => this._print('table', this._tag(chalk.white),   ...args)
}
module.exports.SubConsole = SubConsole
