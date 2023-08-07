import { overrideFiltered } from '@hackbg/over'

export class ConfigError extends Error {
  static Required: ConfigError
}

export class Config {
  constructor (environment?: Environment)
  readonly environment?: Environment
  override (options: object): this
  getFlag <T extends boolean, U> (name: string, fallback?: ()=>T|U): T|U
  getString <T extends string, U> (name: string, fallback?: ()=>T|U): T|U
  getNumber <T extends number, U> (name: string, fallback?: ()=>T|U): T|U
}

export class Environment {
  constructor (cwd: string, vars: typeof process.env, tag:string|undefined)
  /** Current working directory */
  readonly cwd:  string
  /** Environment variables */
  readonly vars: typeof process.env
  /** Tag to identify the environment (e.g. timestamp) */
  readonly tag?: string
  get [Symbol.toStringTag](): string
  getFlag <T extends boolean, U> (name: string, fallback?: ()=>T|U): T|U
  getString <T extends string, U> (name: string, fallback?: ()=>T|U): T|U 
  getNumber <T extends number, U> (name: string, fallback?: ()=>T|U): T|U 
  /** Snapshot of the earliest known process environment
    * (at the moment this module is evaluated) */
  static initial: Environment
  /** Which string values are counted as falsy by getFlag */
  static FALSE: string[]
}
