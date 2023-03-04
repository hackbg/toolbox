import { Timed } from '@hackbg/time'
import CommandsConsole from './CommandsConsole'
import type Step from './Step'

/** A command is a binding between a string and one or more steps
  * that operate sequentially on the same context.  */
export default class Command<C extends object> extends Timed<C, Error> {

  constructor (
    readonly label:       string             = '',
    readonly description: string             = '',
    readonly steps:       Step<C, unknown>[] = [],
  ) {
    super()
    this.log = new CommandsConsole(this.label)
    Object.defineProperty(this, 'log', { enumerable: false, writable: true })
  }

  log: CommandsConsole

  /** Run the command with the specified arguments. */
  async run (
    args:    string[] = process.argv.slice(2),
    context: any = this
  ): Promise<unknown> {
    if (this.started) {
      throw new Error('Command already started.')
    }
    this.started = + new Date()
    let result
    for (const step of this.steps) {
      try {
        result = await step.call(context, ...args)
      } catch (e) {
        this.failed = e as Error
        break
      }
    }
    this.ended = + new Date()
    this.log.commandEnded(this)
    if (this.failed) throw this.failed
    return result
  }

  get longestName (): number {
    return this.steps
      .map((step?: { name?: string })=>step?.name||'(unnamed step)')
      .reduce((max: number, x: string)=>Math.max(max, x.length), 0)
  }

}
