import { Console, bold, colors } from '@hackbg/logs'
import Command from './Command'
import CommandContext from './CommandContext'

export default class CommandsConsole extends CommandsConsoleMixin(Console) {}

export function CommandsConsoleMixin <T extends new (...args: any[]) => Console> (
  Console: T
) {
  return class extends Console {
    label = '@hackbg/cmds'

    // Usage of Command API
    usage ({ constructor: { name }, commandTree }: CommandContext) {

      // Align
      const columns = { name: 0, sub: 0 }
      for (const name of Object.keys(commandTree)) {
        columns.name = Math.max(name.length, columns.name)
        let sub = 0
        if ((commandTree[name] as any).commandTree) {
          sub = String(Object.keys((commandTree[name] as any).commandTree).length).length
        }
        columns.sub = Math.max(sub, columns.sub)
      }
      columns.name += 1
      columns.sub  += 2

      // Display
      const commands = Object.entries(commandTree)
      if (commands.length < 1) {
        this.info(`${name} exposes no commands.`)
        return
      }

      this.br()
      for (let [name, entry] of Object.entries(commandTree)) {
        name = bold(name.padEnd(columns.name))
        let sub = ''
        if ((entry as any).commandTree) {
          const keys = Object.keys((entry as any).commandTree)?.length ?? 0
          sub = `...`
        }
        sub = sub.padStart(columns.sub).padEnd(columns.sub + 1)
        this.info(`${name} ${sub} ${entry.description}`)
      }
      this.br()

    }

    commandEnded (command: Command<any>) {
      const result = command.failed ? colors.red('failed') : colors.green('completed')
      const took   = command.took
      const method = (command.failed ? this.error : this.log).bind(this)
      method(`The command "${bold(command.label)}" ${result} in ${command.took}`)
      for (const step of command.steps) {
        const name     = (step.name ?? '(nameless step)').padEnd(40)
        const status   = step.failed ? `${colors.red('fail')}` : `${colors.green('ok  ')}`
        const timing   = (step.took ?? '').padStart(10)
        method(status, bold(name), timing, 's')
      }
    }

  }
}
