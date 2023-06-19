export type Emitter<T> = {
  emit <U> (type: string, data?: U): T
  on   <U> (type: string, cb: (data: U)=>unknown): T
  off  <U> (type: string, cb: (data: U)=>unknown): T
  once <U> (type: string, cb: (data: U)=>unknown): T
}

export default function createEmitter <T> (retval?: T, target?: EventTarget): Emitter<T>
