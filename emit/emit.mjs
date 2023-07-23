/** Extensible event emitter */
export default class Emitter extends EventTarget {
  emit (type, data={}) {
    this.dispatchEvent(Object.assign(new Event(type), data))
    return this
  }
  on (type, handler) {
    this.addEventListener(type, handler)
    return this
  }
  off (type, handler) {
    this.removeEventListener(type, handler)
    return this
  }
  once (type, handler) {
    const onceHandler = () => {
      this.off(type, onceHandler)
      return handler(args)
    }
    return this.on(type, onceHandler)
  }
}

/** Standalone event emitter. */
export function createEmitter (
  retval,
  target = new EventTarget(),
) {
  const emitter = {
    emit: (type, data={}) => {
      target.dispatchEvent(Object.assign(new Event(type), data))
      return retval
    },
    on: (type, handler) => {
      target.addEventListener(type, handler)
      return retval
    },
    off: (type, handler) => {
      target.removeEventListener(type, handler)
      return retval
    },
    once: (type, handler) => {
      emitter.on(type, function onceHandler () {
        off(type, onceHandler)
        return handler(args)
      })
      return retval
    }
  }
  retval ??= emitter
  return emitter
}
