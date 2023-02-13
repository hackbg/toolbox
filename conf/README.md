# @hackbg/conf

Loads configuration from environment.

Parses the values of "empty string", `false`, `no`, and `0` as negatives.

Example usage with TypeScript:

```typescript
import { Env, EnvConfig } from '@hackbg/conf'

export class MyConfig extends EnvConfig {

  /** This constructor must be copied into every subclass to support the passing of defaults.
    * This is dumb, TODO fix in next version. */
  constructor (
    env:      Env               = {},
    cwd:      string            = '',
    defaults: Partial<MyConfig> = {}
  ) {
    super(env, cwd)
    this.override(defaults)
  }

  /* If you provide no default, when the env var is not defined and error will be thrown */
  myStringField
    = this.getString('MY_STRING_FIELD')

  /* To provide a default value pass a function that returns the default */
  myNumberField
    = this.getNumber('MY_NUMBER_FIELD', () => 0)

  /* To provide a default value pass a function that returns the default */
  myBooleanField
    = this.getBoolean('MY_BOOLEAN_FIELD', () =>
      this.getBoolean('MY_FLAG',          () =>
      this.getBoolean('MY_OTHER_FLAG',    () => {
        if (Math.random() > 0.5) {
          return true
        } else {
          return false
        }
      })))

}

const currentConfig = new MyConfig(process.env, process.cwd, /* {}: defaults */)
```

<div align="center">

Made with #$%& @ [**Hack.bg**](https://foss.hack.bg)

</div>
