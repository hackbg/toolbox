# @hackbg/cmds

**Tiny command parser.**

```typescript
import Commands from '@hackbg/cmds'

class MyCommands extends Commands {
  cmd1 = this.command('cmd1', 'command 1', () => {})
}

new MyCommands('my commands')
  .addCommand('cmd2', 'command 2', () => {}, () => {})
```

<div align="center">

---

Made with **#%&!** @ [**Hack.bg**](https://foss.hack.bg)

</div>
