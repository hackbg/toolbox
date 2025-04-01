# @hackbg/logs

**Logging utilities.**

Exports a `Console` class in ESM and CJS formats.

Usage:

```js
import { Console } from '@hackbg/logs'
// or
const { Console } = require('@hackbg/logs')

const console = new Console("label", {
  color: true, // or false
  json:  true, // or false
  jsonLevelField: 'level', // default: "logMethod"
  jsonMetaField:  'meta',  // default: "logTag"
  jsonDataField:  'data',  // default: "logMessage"
})
console("asdf")
console.log("asdf")
console.warn("asdf")
console.error("asdf")
console.debug("asdf")
console.trace("asdf")
console.table([["asdf","qwer"],["zxcv","uiop"]])
console.table([{asdf:"qwer"},{zxcv:"uiop"}])
console.table({foo:{asdf:"qwer"},bar:{zxcv:"uiop"}})
```

## TODO:

* [ ] Honor `NO_COLOR`

<div align="center">

---

Made with **#%&!** @ [**Hack.bg**](https://foss.hack.bg)

</div>
