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

import * as _SecureRandom from 'secure-random'
const SecureRandom = _SecureRandom.default ?? _SecureRandom
export { SecureRandom }
/** Replaces of randomBytes from node:crypto.
  * Returns Uint8Array of given length. */
export const randomBytes   = SecureRandom.randomBuffer
/** Returns a hex-encoded string of given length.
  * Default is 16 bytes, i.e. 128 bits of entropy. */
export const randomBase16  = (bytes = 16) =>
  SecureRandom.randomBuffer(bytes).toString("hex")
export const randomHex = randomBase16
/** Returns a base64-encoded string of given length.
  * Default is 64 bytes, i.e. 512 bits of entropy. */
export const randomBase64  = (bytes = 64) =>
  SecureRandom.randomBuffer(bytes).toString("base64")

export * from '@scure/base'
import { bech32, bech32m } from '@scure/base'
/** Returns a random valid bech32 address.
  * Default length is 32 bytes (canonical addr in Cosmos) */
export const randomBech32  = (prefix = 'hackbg', bytes = 32) =>
  bech32.encode(prefix, bech32.toWords(SecureRandom.randomBuffer(bytes)))
/** Returns a random valid bech32m address. */
export const randomBech32m = (prefix = 'hackbg', bytes = 32) =>
  bech32m.encode(prefix, bech32m.toWords(SecureRandom.randomBuffer(bytes)))

export * from '@noble/hashes/sha256'

export * from '@scure/bip32'

export * from '@scure/bip39'
