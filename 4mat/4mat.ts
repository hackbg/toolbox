export * from './4mat.browser'

import { webcrypto } from 'node:crypto'
import { base16, base64, bech32, bech32m } from '@scure/base'

/** Returns Uint8Array of given length. */
export const randomBytes = (n: number = 16) =>
  webcrypto.getRandomValues(new Uint8Array(n))

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
