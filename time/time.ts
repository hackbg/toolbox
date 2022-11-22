export function timestamp (d = new Date()) {
  return d.toISOString()
    .replace(/[-:\.Z]/g, '')
    .replace(/[T]/g, '_')
    .slice(0, -3)
}

/** A timed task. */
export abstract class Timed<T, U> {
  started?: number|false = false
  ended?:   number|false = false
  result?:  T
  failed?:  U
  get took (): string|undefined {
    return (this.ended && this.started)
      ? `${((this.ended - this.started)/1000).toFixed(3)}s`
      : undefined
  }
  protected start (): number {
    if (this.started) throw new Error('Already started')
    return this.started = + new Date()
  }
  protected end (): number {
    if (!this.started) throw new Error('Not started yet')
    if (this.ended) throw new Error('Already ended')
    return this.ended = + new Date()
  }
  protected succeed (result: T): number {
    const end = this.end()
    this.result = result
    return end
  }
  protected fail (failed: U): number {
    const end = this.end()
    this.failed = failed
    throw failed
  }
}
