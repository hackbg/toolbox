import { base16, base64, bech32, bech32m } from '@scure/base'

/** Returns a function that throws when called.
  * Use to give more helpful errors when an expected value is missing.
  * use as: `const foo = context.foo || required('value of foo')`
  *     or: `const foo = context.foo ?? required('value of foo')` */
export const required = (label: string) => () => { throw new Error(`${label} is required`) }

/** Picks keys from an object. Returns a new object containing only the given keys. */
export function pick (obj: Record<string, unknown> = {}, ...keys: string[]): Partial<typeof obj> {
  return Object.keys(obj)
    .filter(key=>keys.indexOf(key)>-1)
    .reduce((obj2: Partial<typeof obj>, key: string)=>{
      obj2[key] = obj[key]
      return obj2
    }, {})
}

declare const TextEncoder: any;
declare const TextDecoder: any;
export const utf8 = {
  encode (str: string): Uint8Array {
    return new TextEncoder().encode(str);
  },
  decode (data: Uint8Array): string {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  }
}

/** Returns Uint8Array of given length. */
export const randomBytes = (n: number = 16) =>
  globalThis.crypto.getRandomValues(new Uint8Array(n))

/** Returns a hex-encoded string of given length.
  * Default is 16 bytes, i.e. 128 bits of entropy. */
export const randomBase16 = (n: number = 16) =>
  base16.encode(randomBytes(n))

/** Returns a base64-encoded string of given length.
  * Default is 64 bytes, i.e. 512 bits of entropy. */
export const randomBase64  = (n: number = 64) =>
  base64.encode(randomBytes(n))

/** Returns a random valid bech32 address.
  * Default length is 32 bytes (canonical addr in Cosmos) */
export const randomBech32  = (prefix = 'hackbg', n = 32) =>
  bech32.encode(prefix, bech32.toWords(randomBytes(n)))

/** Returns a random valid bech32m address. */
export const randomBech32m = (prefix = 'hackbg', n = 32) =>
  bech32m.encode(prefix, bech32m.toWords(randomBytes(n)))

export * from '@scure/base'
export * from '@noble/hashes/sha256'
export * as bip32 from '@scure/bip32'
export * as bip39 from '@scure/bip39'
export { wordlist as bip39EN } from '@scure/bip39/wordlists/english'