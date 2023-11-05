import $ from '@hackbg/file'
import { Console } from '@hackbg/logs'

export class DotGit extends Path {
  log = new Console('@hackbg/repo')
  present
  isSubmodule = false

  constructor (base, ...fragments) {
    if (!base) {
      throw new Error(
        'you need to pass a base directory in order to '+
        'compute the path of the corresponding.git datastore'
      )
    }
    if (base instanceof URL) {
      base = fileURLToPath(base)
    }
    super(base, ...fragments, '.git')
    if (!this.exists()) {
      // If .git does not exist, it is not possible to build past commits
      this.log.warn(bold(this.shortPath), 'does not exist')
      this.present = false
    } else if (this.isFile()) {
      // If .git is a file, the workspace is contained in a submodule
      const gitPointer = this.as(TextFile).load().trim()
      const prefix = 'gitdir:'
      if (gitPointer.startsWith(prefix)) {
        // If .git contains a pointer to the actual git directory,
        // building past commits is possible.
        const gitRel = gitPointer.slice(prefix.length).trim()
        const gitPath = $(this.parent, gitRel).path
        const gitRoot = $(gitPath)
        //this.log.info(bold(this.shortPath), 'is a file, pointing to', bold(gitRoot.shortPath))
        this.path = gitRoot.path
        this.present = true
        this.isSubmodule = true
      } else {
        // Otherwise, who knows?
        this.log.info(bold(this.shortPath), 'is an unknown file.')
        this.present = false
      }
    } else if (this.isDirectory()) {
      // If .git is a directory, this workspace is not in a submodule
      // and it is easy to build past commits
      this.present = true
    } else {
      // Otherwise, who knows?
      this.log.warn(bold(this.shortPath), `is not a file or directory`)
      this.present = false
    }
  }

  get rootRepo () {
    return $(this.path.split(DotGit.rootRepoRE)[0])
  }

  get submoduleDir () {
    return this.path.split(DotGit.rootRepoRE)[1]
  }

  /* Matches "/.git" or "/.git/" */
  static rootRepoRE = new RegExp(`${Path.separator}.git${Path.separator}?`)

}
