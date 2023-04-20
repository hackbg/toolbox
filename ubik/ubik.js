// Node natives
import {extname, resolve, basename, dirname, relative, join, isAbsolute} from 'node:path'
import {existsSync, readFileSync, writeFileSync, readdirSync, copyFileSync, unlinkSync} from 'node:fs'
import {execSync, execFileSync} from 'node:child_process'
import {request} from 'node:https'
import {fileURLToPath} from 'node:url'
import process from 'node:process'

// To bail early if the package is already uploaded
import fetch from 'node-fetch'

// To speed things up - runs ESM and CJS compilations in parallel
import concurrently from 'concurrently'
import rimraf from 'rimraf'

// To fix import statements after compiling to ESM
import recast from 'recast'
import recastTS from './ubik.shim.cjs'
import * as acorn from 'acorn'
import * as acornWalk from 'acorn-walk'
import * as astring from 'astring'

// To match files en masse
import fastGlob from 'fast-glob'

import { Console, bold } from '@hackbg/logs'

const ubikPackageJson = resolve(dirname(fileURLToPath(import.meta.url)), 'package.json')
const ubikVersion     = JSON.parse(readFileSync(ubikPackageJson, 'utf8')).version
const console         = new Console(`Ubik ${ubikVersion}`)
console.warn(`Remembering the Node16/TS4 ESM crisis of April 2022...`)

// To draw boxes around things.
// Use with `(await boxen)` because of ERR_REQUIRE_ESM
const boxen = import('boxen')

// TypeScript compiler
const TSC = process.env.TSC || 'node_modules/.bin/tsc'

// Temporary output directories
const dtsOut   = 'dist/dts'
const esmOut   = 'dist/esm'
const cjsOut   = 'dist/cjs'
const distDirs = [dtsOut, esmOut, cjsOut]

// Output extensions
const distDtsExt = '.dist.d.ts'
const distEsmExt = '.dist.mjs'
const distCjsExt = '.dist.cjs'
const distJsExt  = '.dist.js'
const distExts   = [distDtsExt, distEsmExt, distCjsExt, distJsExt]

// Changes x.a to x.b:
const replaceExtension = (x, a, b) => join(dirname(x), `${basename(x, a)}${b}`)

// Determine which package manager to use:
let packageManager = 'npm'
if (process.env.UBIK_PACKAGE_MANAGER) packageManager = process.env.UBIK_PACKAGE_MANAGER
try { execSync('yarn version'); packageManager = 'yarn' } catch (e) { console.info('Yarn: not installed') }
try { execSync('pnpm version'); packageManager = 'pnpm' } catch (e) { console.info('PNPM: not installed') }
console.info(`Using package manager:`, bold(packageManager), `(set`, bold('UBIK_PACKAGE_MANAGER'), 'to change)')

// Main function:
export default async function ubik (cwd, command, ...publishArgs) {

  process.chdir(cwd)

  // Dispatch command.
  switch (command) {
    case 'fix':   return await release(false, true)
    case 'dry':   return await release(false)
    case 'wet':   return await release(true)
    case 'clean': return await cleanAll()
    default:      return usage()
  }

  function usage () {
    console.info(`Usage:\n
                  ${bold('ubik fix')}   - apply compatibility fix without publishing
                  ${bold('ubik dry')}   - test publishing of package with compatibility fix
                  ${bold('ubik wet')}   - publish package with compatibility fix
                  ${bold('ubik clean')} - delete compiled files`)
  }

  function runConcurrently (commands) {
    commands ||= []
    console.log(`Running ${commands.length} commands in`, cwd)
    commands.forEach(command=>console.log(' -', command))
    return concurrently(commands, { cwd })
  }

  /** Perform a release. */
  async function release (
    /** Whether to actually publish to NPM, or just go through the movements ("dry run")  */
    wet  = false,
    /** Whether to keep the modified package.json and dist files */
    keep = false
  ) {
    /** Need the contents of package.json and a way to restore it after modification. */
    const { packageJson } = readPackageJson()
    const { name, version } = packageJson
    /** First deduplication: Make sure the Git tag doesn't exist. */
    const tag = ensureFreshTag(name, version)
    /** Second deduplication: Make sure the library is not already published. */
    if (await isPublished(name, version, wet)) return
    /** Print the contents of package.json if we'll be publishing. */
    console.log('Original package.json:', JSON.stringify(packageJson))
    /** In wet mode, try a dry run first. */
    if (wet) {
      preliminaryDryRun()
    } else {
      makeSureRunIsDry(publishArgs)
    }
    /** Determine if this is a TypeScript package that needs to be compiled and patched. */
    const isTypeScript = (packageJson.main||'').endsWith('.ts')
    try {
      /** Do the TypeScript magic if it's necessary. */
      if (isTypeScript) {
        await prepareTypeScript()
      } else {
        prepareJavaScript()
      }
      /** If this is not a dry run, publish to NPM */
      if (wet) {
        performRelease()
      } else {
        console.log('Dry run successful:', tag)
      }
    } finally {
      /** Restore everything to a (near-)pristine state. */
      await cleanup()
    }

    return packageJson

    async function prepareTypeScript () {
      packageJson.ubik = true
      await compileTypeScript()
      const collectedFiles = await flattenFiles(packageJson)
      await patchPackageJson(packageJson)
      await patchESMImports(packageJson)
      await patchDTSImports(packageJson)
      await patchCJSRequires(packageJson)
      // Print the modified package.json and the contents of the package
      console.warn("Backing up package.json to package.json.bak")
      copyFileSync($('package.json'), $('package.json.bak'))
      console.warn("Applying temporary package.json patch:", JSON.stringify(packageJson))
      copyFileSync($('package.json'), $('package.json.bak'))
      writeFileSync($('package.json'), JSON.stringify(packageJson, null, 2), 'utf8')
      console.log()
      execFileSync('ls', ['-al'], { cwd, stdio: 'inherit', env: process.env })
      // Publish the package, thus modified, to NPM
      console.log(`${packageManager} publish --no-git-checks`, ...publishArgs)
      runPackageManager('publish', '--no-git-checks',  ...publishArgs)
      console.log(`Published ${packageJson.name}`)
      // Restore the original package.json and remove the dist files
      if (!keep) {
        console.log("Restoring original package.json")
        unlinkSync($('package.json'))
        copyFileSync($('package.json.bak'), $('package.json'))
        unlinkSync($('package.json.bak'))
        const console2 = console.sub('(deleting generated files)')
        collectedFiles.forEach(file=>{
          console2.log(file);
          unlinkSync(file)
        })
      } else {
        console.warn("Keeping modified package.json and dist files")
      }
    }

    function prepareJavaScript () {
      console.log('No TypeScript detected, publishing as-is')
      // Publish the package, unmodified, to NPM
      console.log(`${packageManager} publish`, ...publishArgs)
      runPackageManager('publish', ...publishArgs)
      console.log('Published.')
    }

    function performRelease () {
      console.log('Published:', tag)
      // Add Git tag
      if (!process.env.IZOMORF_NO_TAG) {
        execSync(`git tag -f "${tag}"`, { cwd, stdio: 'inherit' })
        if (!process.env.IZOMORF_NO_PUSH) {
          execSync('git push --tags', { cwd, stdio: 'inherit' })
        }
      }
    }

    async function cleanup () {
      if (keep) {
        console
          .warn("Not restoring original package.json; and keeping built artifacts.")
          .warn("Make sure you don't commit compilation results!")
          .warn('On-demand compilation of TS might not work until you restore package.json.bak')
      } else {
        if (isTypeScript) {
          console
            .log("Restored original package.json and deleted the generated files")
            .info("Build with `ubik fix` instead if you want to keep the generated files (e.g. if publishing a tarball)")
        }
      }
    }
  }

  /** Remove output directories */
  function cleanDirs () {
    distDirs.map(out=>rimraf.sync(out))
  }

  /** Remove output files */
  function cleanFiles () {
    return Promise.all(distExts.map(ext=>
        fastGlob([`*${ext}`, `**/*${ext}`]).then(names=>
          names.map(name=>unlinkSync(name)))))
  }

  /** Remove output */
  async function cleanAll () {
    cleanDirs()
    await cleanFiles()
  }

  /** Load package.json. Bail if already modified. */
  function readPackageJson () {
    const packageJson = JSON.parse(readFileSync($('package.json'), 'utf8'))
    if (packageJson.ubik) throw new Error(
      `This is already the modified, temporary package.json. Restore the original ` +
      `(e.g. "mv package.json.bak package.json" or "git checkout package.json") and try again`
    )
    return { packageJson }
  }

  // Bail if Git tag already exists
  function ensureFreshTag (name, version) {
    const tag = `npm/${name}/${version}`
    try {
      execFileSync('git', ['rev-parse'], tag, { cwd, stdio: 'inherit', env: process.env })
      const msg = `Git tag ${tag} already exists. ` +
        `Increment version in package.json or delete tag to proceed.`
      throw new Error(msg)
    } catch (e) {
      console.log(`Git tag "${tag}" not found`)
      return tag
    }
  }

  async function isPublished (name, version, wet) {
    const url = `https://registry.npmjs.org/${name}/${version}`
    const response = await fetch(url)
    if (response.status === 200) {
      console.log(`NPM package ${name} ${version} already exists.`)
      if (wet) {
        console.log(`OK, not publishing:`, url)
        return true
      }
    } else if (response.status !== 404) {
      throw new Error(`ubik: NPM returned ${response.statusCode}`)
    }
  }

  function preliminaryDryRun () {
    runPackageManager('publish', '--dry-run')
  }

  function runPackageManager (...args) {
    return execFileSync(packageManager, args, { cwd, stdio: 'inherit', env: process.env })
  }

  function makeSureRunIsDry (publishArgs = []) {
    if (!publishArgs.includes('--dry-run')) publishArgs.unshift('--dry-run')
  }

  // Find file relative to working directory
  function $ (...args) {
    return join(cwd, ...args)
  }

  // Convert absolute path to relative
  function toRel (path) {
    return `./${isAbsolute(path)?relative(cwd, path):path}`
  }

  // Compile TS -> JS
  async function compileTypeScript () {
    console.log('Compiling TypeScript...')
    const result = await runConcurrently([
      // TS -> ESM
      `${TSC} --outDir ${esmOut} --target es2016 --module es6 --declaration --declarationDir ${dtsOut}`,
      // TS -> CJS
      `${TSC} --outDir ${cjsOut} --target es6 --module commonjs`
    ], { cwd }).result
  }

  // If "type" === "module", .dist.js is used for the ESM files, otherwise for the CJS ones.
  function getExtensions (isESModule) {
    return {
      usedEsmExt: isESModule ? distJsExt  : distEsmExt,
      usedCjsExt: isESModule ? distCjsExt : distJsExt
    }
  }

  async function flattenFiles (packageJson) {
    const isESModule = (packageJson.type === 'module')
    const { usedEsmExt, usedCjsExt } = getExtensions(isESModule)

    // Files given new locations by the flattening.
    // Deleted after publication - unless you run `ubik fix`, which keeps them around.
    const collectedFiles = new Set()

    // Collect output in package root and add it to "files" in package.json:
    console.log('Flattening package...')
    const files = [
      ...await collectFiles('ESM', esmOut, '.js',   usedEsmExt),
      ...await collectFiles('CJS', cjsOut, '.js',   usedCjsExt),
      ...await collectFiles('DTS', dtsOut, '.d.ts', distDtsExt),
    ]

    packageJson.files = [...new Set([...packageJson.files||[], ...files])].sort()

    console.log('Removing dist directories...')
    cleanDirs()

    return collectedFiles

    async function collectFiles (name, dir, ext1, ext2) {
      const { log } = console.sub(`(collecting ${name})`)
      log(`Collecting from "${dir}/**/*${ext1}" into "./**/*${ext2}"`)
      const inputs = await fastGlob([`${dir}/*${ext1}`, `${dir}/**/*${ext1}`])
      const outputs = []
      for (const file of inputs) {
        if (!file.endsWith(ext1)) continue
        const srcFile = $(file)
        const newFile = replaceExtension(relative(dir, file), ext1, ext2)
        log(`${toRel(srcFile)} -> ${toRel(newFile)}`)
        copyFileSync(srcFile, newFile)
        unlinkSync(srcFile)
        outputs.push(newFile)
        collectedFiles.add(newFile)
      }
      return outputs
    }
  }

  async function patchPackageJson (packageJson) {
    const isESModule = (packageJson.type === 'module')
    const { usedEsmExt, usedCjsExt } = getExtensions(isESModule)
    const main        = $(packageJson.main    || 'index.ts')
    const browserMain = $(packageJson.browser || 'index.browser.ts') // TODO
    // Set "main", "types", and "exports" in package.json.
    const esmMain = replaceExtension(main, '.ts', usedEsmExt)
    const cjsMain = replaceExtension(main, '.ts', usedCjsExt)
    const dtsMain = replaceExtension(main, '.ts', distDtsExt)
    packageJson.types = toRel(dtsMain)
    packageJson.exports ??= {}
    if (isESModule) {
      packageJson.main = toRel(esmMain)
      packageJson.exports["."] = {
        "source":  toRel(main),
        "require": toRel(cjsMain),
        "default": toRel(esmMain)
      }
    } else {
      packageJson.main = toRel(esmMain)
      packageJson.exports["."] = {
        "source":  toRel(main),
        "import":  toRel(esmMain),
        "default": toRel(cjsMain)
      }
    }
  }

  async function patchESMImports (packageJson) {
    const console2 = console.sub('(patching ESM)')
    console.log('Patching ESM imports...')
    const isESModule = (packageJson.type === 'module')
    const { usedEsmExt } = getExtensions(isESModule)
    const declarationsToPatch = [
      'ImportDeclaration',
      'ExportDeclaration',
      'ImportAllDeclaration',
      'ExportAllDeclaration',
      'ExportNamedDeclaration'
    ]
    for (const file of packageJson.files.filter(x=>x.endsWith(usedEsmExt))) {
      const console3 = console2.sub(file)
      console3.log('Patching...')
      const ast = acorn.parse(readFileSync(file, 'utf8'), {
        ecmaVersion: process.env.UBIK_ECMA||'latest',
        sourceType: 'module'
      })
      let modified = false
      for (const declaration of ast.body) {
        if (!declarationsToPatch.includes(declaration.type) || !declaration.source?.value) continue
        const oldValue     = declaration.source.value
        const isRelative   = oldValue.startsWith('./') || oldValue.startsWith('../')
        const isNotPatched = !oldValue.endsWith(usedEsmExt)
        if (isRelative && isNotPatched) {
          const newValue = `${oldValue}${usedEsmExt}`
          console3.log(oldValue, '->', newValue)
          declaration.source.value = newValue
          modified = true
        }
      }
      if (modified) {
        console3.log('Writing patched file')
        writeFileSync(file, astring.generate(ast), 'utf8')
      }
    }
  }

  async function patchDTSImports (packageJson) {
    const console2 = console.sub('(patching DTS)')
    console2.log('Patching DTS imports...')
    const declarationsToPatch = [
      'ImportDeclaration',
      'ExportDeclaration',
      'ImportAllDeclaration',
      'ExportAllDeclaration',
      'ExportNamedDeclaration'
    ]
    for (const file of packageJson.files.filter(x=>x.endsWith(distDtsExt))) {
      const console3 = console2.sub(file)
      console3.log('Patching')
      const source = readFileSync(file, 'utf8')
      const parsed = recast.parse(source, { parser: recastTS })
      let modified = false
      for (const declaration of parsed.program.body) {
        if (!declarationsToPatch.includes(declaration.type) || !declaration.source?.value) continue
        const oldValue     = declaration.source.value
        const isRelative   = oldValue.startsWith('./') || oldValue.startsWith('../')
        const isNotPatched = !oldValue.endsWith(distDtsExt)
        if (isRelative && isNotPatched) {
          const newValue = `${oldValue}.dist`
          console3.log(oldValue, '->', newValue)
          declaration.source.value = newValue
          modified = true
        }
      }
      if (modified) {
        console3.log('Writing patched file')
        writeFileSync(file, recast.print(parsed).code, 'utf8')
      }
    }
  }

  async function patchCJSRequires (packageJson) {
    const console2 = console.sub('(patching CJS)')
    console2.log('Patching CJS requires...')
    const isESModule = (packageJson.type === 'module')
    const { usedCjsExt } = getExtensions(isESModule)
    for (const file of packageJson.files.filter(x=>x.endsWith(usedCjsExt))) {
      const console3 = console2.sub(file)
      console3.log('Patching')
      const ast = acorn.parse(readFileSync(file, 'utf8'), {
        ecmaVersion: process.env.UBIK_ECMA||'latest',
        sourceType: 'module',
        locations:  true
      })
      let modified = false
      acornWalk.simple(ast, {
        CallExpression (node) {
          const { callee: { type, name }, loc: { start: { line, column } } } = node
          const args = node['arguments']
          if (
            type === 'Identifier' &&
            name === 'require' // GOTCHA: if "require" is renamed to something else, idk
          ) {
            if (args.length === 1 && args[0].type === 'Literal') {
              const value = args[0].value
              if (value.startsWith('./') || value.startsWith('../')) {
                const target = `${resolve(dirname(file), value)}.ts`
                if (existsSync(target)) {
                  const newValue = `${value}${usedCjsExt}`
                  console3.log(`require("${value}") -> require("${newValue}")`)
                  args[0].value = newValue
                  modified = true
                } else {
                  console3.log(`require("${value}"): ${relative(cwd, target)} not found, ignoring`)
                }
              }
            } else {
              console3.warn(
                `Non-standard require() call encountered at ${file}:${line}:${column}. `+
                `This library only patches calls of the format "require('./my-module')".'\n` +
                `File an issue at https://github.com/hackbg/toolbox if you need ` +
                `to patch more complex require calls.`
              )
            }
          }

        }

      })

      if (modified) {
        console3.log('Writing patched file')
        writeFileSync(file, astring.generate(ast), 'utf8')
      }

    }
  }

}
