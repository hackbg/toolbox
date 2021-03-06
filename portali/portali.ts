import * as http from 'http'
import * as net from 'net'
import { backOff } from "exponential-backoff"

export { backOff }

/** Get a random free port number by briefly running a server on a random unused port,
  * then stopping the server and returning the port number. */
export function freePort (): Promise<number> {
  return new Promise((ok, fail)=>{
    let port = 0
    const server = net.createServer()
    server.on('listening', () => {
      port = (server.address() as { port: number }).port
      server.close()
    })
    server.on('close', () => ok(port))
    server.on('error', fail)
    server.listen(0, '127.0.0.1')
  })
}

/** Based on https://github.com/Chris927/wait-for-host/blob/master/LICENSE */
export function waitPort ({
  host = 'localhost',
  port,
  retries   = 10,
  interval  = 1000,
}: {
  host:      string
  port:      number
  retries?:  number
  interval?: number
}): Promise<void> {

  let timer:  ReturnType<typeof setTimeout>|null = null
  let socket: net.Socket                   |null = null

  return new Promise<void>((resolve, reject)=>{

    tryToConnect()

    function tryToConnect() {

      clearTimerAndDestroySocket()

      if (--retries < 0) {
        reject(new Error('out of retries'))
      }

      socket = net.createConnection(port, host, () => {
        clearTimerAndDestroySocket()
        if (retries > 0) resolve()
      });

      timer = setTimeout(function() { retry() }, interval)

      socket.on('error', () => {
        clearTimerAndDestroySocket()
        setTimeout(retry, interval)
      })

    }

    function clearTimerAndDestroySocket() {
      if (timer) clearTimeout(timer)
      timer = null
      socket?.destroy()
      socket = null
    }

    function retry() {
      tryToConnect()
    }

  })

}

/** API endpoint client. */
export class Endpoint {
  url: URL
  constructor (url: string) {
    this.url = new URL(url)
  }
  get (pathname: string = '', params: Record<string, string> = {}): Promise<any> {
    const url = Object.assign(new URL(this.url.toString()), { pathname })
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return new Promise((resolve, reject)=>{
      this._get(url.toString(), res => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => resolve(JSON.parse(data)))
      }).on('error', reject)
    })
  }
  _get = http.get
}
