# @hackbg/file

**Filesystem utilities.**

Your OS's filesystem isn't the most powerful database,
it's one of the more familiar and human-friendly ones out there.

This package exports:

* The `$` helper function, which concatenates paths.
* The `File` and `Directory` classes, which you can use to
  specify whether you expect a file or a directory at a given path.
* The `JSONFile`, `YAMLFile` etc. subclasses for automatically
  loading data in a given format.
* Reexports `fs`, `fs/promises`, as well as `mkdirp` and `rimraf`.

```javascript
import $, { Directory, TextFile, JSONFile } from '@hackbg/file'

const root = $(process.cwd())

// Access files through a directory
const dir = root.in('data').as(Directory).make()
dir.at('file.txt').as(TextFile).save('my data')
dir.at('file.json').as(JSONFile).save({my:'data'})
console.log(dir.list())

// Or directly
console.log(new JSONFile(root, 'data', 'file.json').load())
console.log(root.in('data').at('file.txt').as(TextFile).load())
```

<div align="center">

---

Made with **#%&!** @ [**Hack.bg**](https://foss.hack.bg)

</div>
