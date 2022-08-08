# Konfizi

Loads configuration from environment.

Parses the values of "empty string", `false`, `no`, and `0` as negatives.

Example usage with TypeScript:

```typescript
export interface Config {
  agentName:     string|null
  agentAddress:  string|null
  agentMnemonic: string|null
  mainnetUrl:    string
  testnetUrl:    string
}

/** Get configuration from the environment. */
function getConfig (
  env: Record<string, string> = {}
): Config {
  const { Str, Bool } = getFromEnv(env)
  return {
    agentName:      Str('AGENT_NAME',     ()=>null),
    agentAddress:   Str('AGENT_ADDRESS',  ()=>null),
    agentMnemonic:  Str('AGENT_MNEMONIC', ()=>null),
    isMainnet:     Bool('IS_MAINNET',     ()=>false),
    mainnetUrl:     Str('MAINNET_URL',    ()=>'http://default.mainnet.url'),
    testnetUrl:     Str('TESTNET_URL',    ()=>'http://default.testnet.url'),
  }
}

const currentConfig = getConfig(process.env)
```
