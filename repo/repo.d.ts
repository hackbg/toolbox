import type { Path } from '@hackbg/file'
import type { Console } from '@hackbg/logs'

/** Represents the real location of the Git data directory.
  * - In standalone repos this is `.git/`
  * - If the contracts workspace repository is a submodule,
  *   `.git` will be a file containing e.g. "gitdir: ../.git/modules/something" */
export declare class DotGit extends Path {
  log: Console
  /** Whether a .git is present */
  readonly present: boolean
  /** Whether the workspace's repository is a submodule and
    * its .git is a pointer to the parent's .git/modules */
  readonly isSubmodule: boolean

  constructor (base: string|URL, ...fragments: string[])

  get rootRepo (): Path

  get submoduleDir (): string

  static rootRepoRE: RegExp
}
