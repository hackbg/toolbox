type EnvMap = Record<string, string>

export function envConfig <C> (cb: (get: EnvConf, cwd: string, env: EnvMap)=>C) {
  return function getConfigFromEnv (cwd = process.cwd(), env: EnvMap = process.env as EnvMap) {
    return cb(getFromEnv(env), cwd, env)
  }
}

interface EnvConf {
  /** Get a string value from the environment. */
  Str  <T> (name: string, fallback: ()=>string|T):  string|T
  /** Get a boolean value from the environment. */
  Bool <T> (name: string, fallback: ()=>boolean|T): boolean|T
}

export function getFromEnv (env: Record<string, string> = {}): EnvConf {
  return {

    Str <T> (name: string, fallback: ()=>T = () => null as unknown as T): string|T {
      if (env.hasOwnProperty(name)) {
        return String(process.env[name] as string)
      } else {
        return fallback()
      }
    },

    Bool <T> (name: string, fallback: ()=>T = () => null as unknown as T): boolean|T {
      if (env.hasOwnProperty(name)) {
        let value = process.env[name] as string
        if (value === '' || value === 'false' || value === 'no' || Number(value) === 0) {
          return false
        }
        return Boolean(value)
      } else {
        return fallback()
      }
    }

  }
}
