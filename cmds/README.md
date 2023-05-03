# @hackbg/cmds

<div align="center">

Tiny command parser.

---

Made with **#%&!** @ [**Hack.bg**](https://foss.hack.bg)

</div>

```typescript
import { CommandContext } from '@hackbg/cmds'

class MyCommands extends CommandContext {
  cmd1 = this.command('cmd1', 'command 1', () => {})
}

new MyCommands('my commands')
  .addCommand('cmd2', 'command 2', () => {}, () => {})
```
