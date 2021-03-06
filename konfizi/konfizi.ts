type EnvMap = Record<string, string>

export function envConfig <C> (cb: (get: EnvConf, cwd: string, env: EnvMap)=>C) {
  return function getConfigFromEnv (cwd = process.cwd(), env: EnvMap = process.env as EnvMap) {
    return cb(getFromEnv(env), cwd, env)
  }
}

interface EnvConf {
  /** Get a string value from the environment. */
  Str  (name: string, fallback: ()=>string|null):  string|null
  /** Get a boolean value from the environment. */
  Bool (name: string, fallback: ()=>boolean|null): boolean|null
}

export function getFromEnv (env: Record<string, string> = {}): EnvConf {
  return {
    Str (name, fallback = () => null): string|null {
      if (env.hasOwnProperty(name)) {
        return String(process.env[name] as string)
      } else {
        return fallback()
      }
    },
    Bool (name, fallback = () => null): boolean|null {
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
