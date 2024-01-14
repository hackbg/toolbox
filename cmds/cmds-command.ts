import type Step from './cmds-step'

import { Timed } from '@hackbg/time'
import { Console, colors, bold } from '@hackbg/logs'

/** A command is a binding between a string and one or more steps
  * that operate sequentially on the same context.  */
export default class Command<C extends object> extends Timed<C, Error> {
  name:  string
  args:  string
  info:  string
  steps: Step<C, unknown>[]
  log:   Console

  constructor (parameters: Partial<Command<C>> = {}) {
    super()
    this.name = parameters.name
    this.args = parameters.args
    this.info = parameters.info
    this.steps = parameters.steps
    this.log = parameters.log || new Console(this.name)
    Object.defineProperty(this, 'log', { enumerable: false, writable: true })
    this.args = parameters.args
  }

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
    if (this.after) this.after()
    if (this.failed) throw this.failed
    return result
  }

  get longestName (): number {
    return this.steps
      .map((step?: { name?: string })=>step?.name||'(unnamed step)')
      .reduce((max: number, x: string)=>Math.max(max, x.length), 0)
  }

  after = () => {}
}

export class Command2<C extends object> extends Command<C> {
}

export const afterSteps = (command: Command<any>) => {
  const result = command.failed ? colors.red('failed') : colors.green('completed')
  const took   = command.took
  const logMethod = (command.failed ? command.log.error : command.log.log).bind(command.log)
  command.log.br()
  logMethod(`The command "${bold(command.name)}" ${result} in ${command.took}`)
  for (const step of command.steps) {
    const name     = (step.name ?? '(nameless step)').padEnd(40)
    const status   = step.failed ? `${colors.red('fail')}` : `${colors.green('ok  ')}`
    const timing   = (step.took ?? '').padStart(10)
    logMethod(status, bold(name), timing, 's')
  }
  command.log.br()
}
