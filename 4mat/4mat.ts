export * from './4mat.browser'

import { webcrypto } from 'node:crypto'

/** Returns Uint8Array of given length. */
export const randomBytes = (n: number = 16) =>
  webcrypto.getRandomValues(new Uint8Array(n))
