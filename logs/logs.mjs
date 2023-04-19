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

export class Console extends defineCallable(function log(...args){
  this.log(...args)
}) {

  constructor (label, options = {}) {
    super()
    this.label  = options.label  ?? label ?? ''
    this.parent = options.parent ?? console
    hideProperties(this, 'tags', 'parent')
  }

  label

  parent

  get [Symbol.toStringTag]() {
    return this.label
  }

  get width () {
    return process.stdout.columns
  }

  sub = (label, options = {}) =>
    new Console(label, { ...options, parent: this })
  br = () =>
    this.parent.log()
  log   = (first, ...rest) =>
    this._print('log',   this._tag(chalk.green,   '  LOG '), first, ...rest)
  info  = (first, ...rest) =>
    this._print('info',  this._tag(chalk.blue,    ' INFO '), first, ...rest)
  warn  = (first, ...rest) =>
    this._print('warn',  this._tag(chalk.yellow,  ' WARN '), first, ...rest)
  error = (first, ...rest) =>
    this._print('error', this._tag(chalk.red,     'ERROR '), first, ...rest)
  debug = (first, ...rest) =>
    this._print('debug', this._tag(chalk.magenta, 'DEBUG '), first, ...rest)
  trace = (first, ...rest) =>
    this._print('trace', this._tag(chalk.magenta, 'TRACE '), first, ...rest)
  table = (first, ...rest) =>
    this._print('table', this._tag(chalk.white,   'TABLE '), first, ...rest)

  _print = (method, tag, first, ...rest) => {
    this.parent[method](tag, first, ...rest);
    return first
  }

  _tag = (color, string) => {
    return chalk.inverse(color(string)) + ' ' + color(this.label)
  }

}
