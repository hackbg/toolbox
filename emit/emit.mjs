/** Embeddable event emitter. */
export default function createEmitter (
  retval,
  target = new EventTarget(),
) {

  const emitter = {
    emit: (type, data={}) => {
      t.dispatchEvent(Object.assign(new Event(type), data))
      return retval
    },
    on: (type, handler) => {
      t.addEventListener(type, handler)
      return retval
    },
    off: (type, handler) => {
      t.removeEventListener(type, handler)
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
