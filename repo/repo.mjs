//@ts-check
import { SyncFS } from '@hackbg/file'
import { Console, bold } from '@hackbg/logs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { chdir } from 'node:process'

export class DotGit extends SyncFS.Path {
  log = new Console('@hackbg/repo')
  present
  isSubmodule = false

  constructor (base, ...fragments) {
    if (!base) {
      throw new Error(
        'you need to pass a base directory in order to '+
        'compute the path of the corresponding .git datastore'
      )
    }
    if (base instanceof URL) {
      base = fileURLToPath(base)
    }
    super(base, ...fragments, '.git')
    if (!this.exists()) {
      // If .git does not exist, it is not possible to build past commits
      this.log.warn(bold(this.short), 'does not exist')
      this.present = false
    } else if (this.isFile()) {
      // If .git is a file, the workspace is contained in a submodule
      const gitPointer = new SyncFS.File(this).load().trim()
      const prefix = 'gitdir:'
      if (gitPointer.startsWith(prefix)) {
        // If .git contains a pointer to the actual git directory,
        // building past commits is possible.
        const gitRel = gitPointer.slice(prefix.length).trim()
        const gitPath = new SyncFS.File(this.parent, gitRel).absolute
        const gitRoot = new SyncFS.Directory(gitPath)
        //this.log.info(bold(this.short), 'is a file, pointing to', bold(gitRoot.short))
        this.path = gitRoot.absolute
        this.present = true
        this.isSubmodule = true
      } else {
        // Otherwise, who knows?
        this.log.info(bold(this.short), 'is an unknown file.')
        this.present = false
      }
    } else if (this.isDirectory()) {
      // If .git is a directory, this workspace is not in a submodule
      // and it is easy to build past commits
      this.present = true
    } else {
      // Otherwise, who knows?
      this.log.warn(bold(this.short), `is not a file or directory`)
      this.present = false
    }
  }

  get rootRepo () {
    return new SyncFS.Path(this.path.split(DotGit.rootRepoRE)[0])
  }

  get submoduleDir () {
    return this.path.split(DotGit.rootRepoRE)[1]
  }

  /* Matches "/.git" or "/.git/" */
  static rootRepoRE = new RegExp(`${SyncFS.Path.separator}.git${SyncFS.Path.separator}?`)

}

/** FIXME: this was part of the fadroma build script, but
 * fetching commits from history into a temporary checkout
 * should happen outside of the container. */
export function cloneHistory ({
  buildRoot,
  call,
  exit,
  git,
  gitRemote,
  gitRoot,
  gitSubdir,
  log,
  lookAround,
  noFetch,
  run,
  sourceRef,
  srcSubdir,
  time,
  tmpGit,
  warn,
}) {
  if (!git) {
    throw new Error("please install git")
  }
  log(`Compiling from checkout of ${sourceRef}`)
  // This works by using ".git" (or "../???/.git/modules/something") as a remote
  // and cloning from it. Since we may need to modify that directory,
  // we'll make a copy. This may be slow if ".git" is huge
  // (but at least it's not the entire working tree with node_modules etc)
  time(`cp -rT "${gitRoot}" "${tmpGit}"`)
  gitRoot = tmpGit
  // Helper functions to run with ".git" in a non-default location.
  const gitDir  = resolve(gitRoot, gitSubdir)
  const gitRun  = command => run(`GIT_DIR=${gitDir} git --no-pager ${command}`)
  const gitCall = command => call(`GIT_DIR=${gitDir} git --no-pager ${command}`)
  // Make this a bare checkout by removing the path to the working tree from the config.
  // We can't use "config --local --unset core.worktree" - since the working tree path
  // does not exist, git command invocations fail with "no such file or directory".
  const gitConfigPath = resolve(gitDir, 'config')
  let gitConfig = readFileSync(gitConfigPath, 'utf8')
  gitConfig = gitConfig.replace(/\s+worktree.*/g, '')
  writeFileSync(gitConfigPath, gitConfig, 'utf8')
  try {
    // Make sure that .refs/heads/${ref} exists in the git history dir,
    // (it will exist if the branch has been previously checked out).
    // This is necessary to be able to clone that branch from the history dir -
    // "git clone" only looks in the repo's refs, not the repo's remotes' refs
    gitRun(`show-ref --verify --quiet refs/heads/${sourceRef}`)
  } catch (e) {
    // If the branch is not checked out, but is fetched, do a "fake checkout":
    // create a ref under refs/heads pointing to that branch.
    if (noFetch) {
      console.error(`${sourceRef} is not checked out or fetched. Run "git fetch" to update.`)
      exit(1)
    } else {
      try {
        warn(`${sourceRef} is not checked out. Creating branch ref from ${gitRemote}/${sourceRef}\n.`)
        gitRun(`fetch origin --recurse-submodules ${sourceRef}`)
      } catch (e) {
        warn(`${sourceRef}: failed to fetch: ${e.message}`)
      }
      const shown     = gitCall(`show-ref --verify refs/remotes/${gitRemote}/${sourceRef}`)
      const remoteRef = shown.split(' ')[0]
      const refPath   = resolve(`${gitDir}/refs/heads/`, sourceRef)
      mkdirSync(dirname(refPath), { recursive: true })
      writeFileSync(refPath, remoteRef, 'utf8')
      gitRun(`show-ref --verify --quiet refs/heads/${sourceRef}`)
    }
  }
  // Clone from the temporary local remote into the temporary working tree
  git(`clone --recursive -b ${sourceRef} ${gitDir} ${buildRoot}`)
  chdir(buildRoot)
  // Report which commit we're building and what it looks like
  git(`log -1`)
  lookAround('.')
  log()
  // Clone submodules
  log(`Populating Git submodules...`)
  git(`submodule update --init --recursive`)
  chdir(srcSubdir)
}
