const _Error = global.Error

export class Error extends _Error {

  /** Define an error subclass. */
  static define <T extends unknown[]> (
    name: string,
    getMessage = (...args: T) => ''
  ) {
    const fullName = `${this.name}_${name}`
    return Object.defineProperty(class CustomError extends this {
      constructor (...args: T) {
        const message = getMessage(...args)
        super(message)
      }
      name = fullName
    }, 'name', { value: fullName })
  }

}