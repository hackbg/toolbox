export type Env = Record<string, string|undefined>

export default class EnvConfig {

  constructor (
    readonly env: Env    = {},
    readonly cwd: string = ''
  ) {}

  getStr <T> (name: string, fallback?: ()=>T): string|T {
    if (this.env.hasOwnProperty(name)) {
      return String(process.env[name] as string)
    } else if (fallback) {
      return fallback()
    } else {
      throw new Error(`The environment variable ${name} (string) is required.`)
    }
  }

  getBool <T> (name: string, fallback?: ()=>T): boolean|T {
    if (this.env.hasOwnProperty(name)) {
      let value = (process.env[name]??'').trim()
      return !this.FALSE.includes(value)
    } else if (fallback) {
      return fallback()
    } else {
      throw new Error(`The environment variable ${name} (boolean) is required.`)
    }
  }

  FALSE = [ '', 'false', 'no', '0' ]

}
