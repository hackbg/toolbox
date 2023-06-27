/** Embeddable event emitter. */
export default function createEmitter (
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
