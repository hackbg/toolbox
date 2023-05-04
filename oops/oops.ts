const BaseError = Error

export const BaseOopsError = class Error extends BaseError {

  /** Define an error subclass. */
  static define <T extends unknown[]> (
    /** Name of error class. Prepended to parent. */
    name: string,
    /** How to generate the error message from the arguments passed to the constructor. */
    getMessage: (string|((...args: T)=>string)) = (...args: T) => args.join(' '),
    /** Whether there are any further construction steps such as assigning properties. */
    construct?: (self: Error, ...args: T) => any
  ) {

    const fullName = `${this.name}_${name}`

    class OopsError extends this {
      name = fullName
      constructor (...args: T) {
        super((typeof getMessage === 'string') ? getMessage : getMessage(...args))
        if (construct) construct(this, ...args)
      }
    }

    return Object.defineProperty(OopsError, 'name', { value: fullName })

  }

}

export { BaseOopsError as Error }
