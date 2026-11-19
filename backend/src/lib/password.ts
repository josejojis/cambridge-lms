import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto'

// scrypt (memory-hard KDF from Node's standard library: no native add-on to build on Windows).
// Format: scrypt$N$r$p$saltB64$hashB64, so parameters can be raised later without breaking old hashes.
const N = 2 ** 15, r = 8, p = 1, KEYLEN = 64
const scrypt = (pw: string, salt: Buffer, opts: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw, salt, KEYLEN, opts, (e, k) => (e ? rej(e) : res(k))))
const opts = (n: number, rr: number, pp: number) => ({ N: n, r: rr, p: pp, maxmem: 128 * n * rr * 2 })

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, opts(N, r, p))
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, rr, pp, salt, hash] = stored.split('$')
  if (alg !== 'scrypt' || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const key = await scrypt(password, Buffer.from(salt, 'base64'), opts(+n, +rr, +pp))
  return key.length === expected.length && timingSafeEqual(key, expected)
}
