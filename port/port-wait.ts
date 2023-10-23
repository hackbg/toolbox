import { Console } from '@hackbg/logs'
import * as net from 'net'

/** Based on https://github.com/Chris927/wait-for-host/blob/master/LICENSE */
export function waitPort ({
  host = 'localhost', port, retries = 10, interval = 1000
}: {
  host: string, port: number, retries?: number, interval?: number
}): Promise<void> {

  let log = new Console(`@hackbg/port: ${host}:${port}`)
  let timer: ReturnType<typeof setTimeout>|null = null
  let socket: net.Socket|null = null

  return new Promise<void>((resolve, reject)=>{

    tryToConnect()

    function tryToConnect() {

      log.debug('Connecting...')
      clearTimerAndDestroySocket()

      if (--retries < 0) {
        log.error('Timed out')
        reject(new Error('out of retries'))
      }

      socket = net.createConnection(port, host, () => {
        log.debug('Connected')
        clearTimerAndDestroySocket()
        if (retries > 0) resolve()
      });

      timer = setTimeout(function() { retry() }, interval)

      socket.on('error', () => {
        log.error('Connection error')
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
