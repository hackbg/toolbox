#!/usr/bin/env node

// Node natives
const {extname, resolve, basename, dirname, relative, join, isAbsolute} = require('path')
const {existsSync, readFileSync, writeFileSync, readdirSync, copyFileSync, unlinkSync} = require('fs')
const {execSync, execFileSync} = require('child_process')
const {request} = require('https')
const {fileURLToPath} = require('url')
const process = require('process')

// To bail early if the package is already uploaded
const fetch        = require('node-fetch')

// To speed things up - runs ESM and CJS compilations in paralle
const concurrently = require('concurrently')

// To fix import statements when compiling to ESM
const recast       = require('recast')

// To draw boxes around things.
// Use with `(await boxen)` because of ERR_REQUIRE_ESM
const boxen        = import('boxen')

// TypeScript compiler
const TSC          = process.env.TSC || 'tsc'

// Temporary output directories
const dtsOut       = 'dist/dts'
const esmOut       = 'dist/esm'
const cjsOut       = 'dist/cjs'
const distDirs     = [dtsOut, esmOut, cjsOut]

// Output extensions
const distDtsExt   = '.dist.d.ts'
const distEsmExt   = '.dist.mjs'
const distCjsExt   = '.dist.cjs'
const distJsExt    = '.dist.js'
const distExts     = [distDtsExt, distEsmExt, distCjsExt, distJsExt]

// Changes x.a to x.b:
const replaceExtension = (x, a, b) => `${basename(x, a)}${b}`

// Determine which package manager to use:
let packageManager = 'npm'
if (process.env.UBIK_PACKAGE_MANAGER) packageManager = process.env.UBIK_PACKAGE_MANAGER
try { execSync('yarn version'); packageManager = 'yarn' } catch (e) { console.info('Yarn: not installed') }
try { execSync('pnpm version'); packageManager = 'pnpm' } catch (e) { console.info('PNPM: not installed') }
console.info('Using package manager:', packageManager)

// Export for programmatical reuse:
module.exports = module.exports.default = ubik

// Main function:
async function ubik (cwd, command, ...publishArgs) {

  // Dispatch command.
  switch (command) {
    case 'fix':   return await release(false, true)
    case 'dry':   return await release(false)
    case 'wet':   return await release(true)
    case 'clean': return await cleanAll()
    default:      return usage()
  }

  function usage () {
    console.log(`
    Usage:
      ubik fix   - apply compatibility fix without publishing
      ubik dry   - test publishing of package with compatibility fix
      ubik wet   - publish package with compatibility fix
      ubik clean - delete compiled files`)
  }

  /** Perform a release. */
  async function release (
    /** Whether to actually publish to NPM, or just go through the movements ("dry run")  */
    wet  = false,
    /** Whether to keep the modified package.json - for further inspection, or for        */
    /** reuse in environments where on-demand compilation of TypeScript is not supported. */
    keep = false
  ) {
    /** Need the contents of package.json and a way to restore it after modification. */
    const { packageJson, restoreOriginalPackageJson } = readPackageJson()
    const { name, version } = packageJson
    /** First deduplication: Make sure the Git tag doesn't exist. */
    const tag = ensureFreshTag(name, version)
    /** Second deduplication: Make sure the library is not already published. */
    if (await isPublished(name, version)) return
    /** Print the contents of package.json if we'll be publishing. */
    console.log('Original package.json:', packageJson, '\n')
    /** In wet mode, try a dry run first. */
    if (wet) preliminaryDryRun(); else makeSureRunIsDry(publishArgs)
    const isTypeScript = (packageJson.main||'').endsWith('.ts')
    try {
      /** Do the TypeScript magic if it's necessary. */
      if (isTypeScript) await prepareTypeScript(); else prepareJavaScript()
      if (wet) performRelease(); else console.log('\nDry run successful:', tag)
    } finally {
      /** Restore everything to a (near-)pristine state. */
      await cleanup()
    }

    return packageJson

    async function prepareTypeScript () {
      packageJson.ubik = true
      await compileTypeScript()
      await flattenFiles(packageJson)
      await patchPackageJson(packageJson)
      await patchESMImports(packageJson)
      await patchCJSRequires(packageJson)
      // Print the contents of the package
      console.warn("\nTemporary modification to package.json (don't commit!)", packageJson)
      writeFileSync($('package.json'), JSON.stringify(packageJson, null, 2), 'utf8')
      console.log()
      execFileSync('ls', ['-al'], { cwd, stdio: 'inherit', env: process.env })
      // Publish the package, thus modified, to NPM
      console.log(`\n${packageManager} publish --no-git-checks`, ...publishArgs)
      runPackageManager('publish', '--no-git-checks',  ...publishArgs)
    }

    function prepareJavaScript () {
      console.info('No TypeScript detected, publishing as-is')
      // Publish the package, unmodified, to NPM
      console.log(`\n${packageManager} publish`, ...publishArgs)
      runPackageManager('publish', ...publishArgs)
    }

    function performRelease () {
      console.log('\nPublished:', tag)
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
        console.info((await boxen).default([
          "WARNING: Not restoring original package.json.",
          "Make sure you don't commit it!",
          "Use `git checkout package.json` to bring back the original.",
          'On-demand compilation of TS might not work.',
          '("main" and "exports" now point to the compiled code',
          'instead of the original source).',
        ].join('\n'), { padding: 1, margin: 1 }))
      } else {
        restoreOriginalPackageJson()
        if (isTypeScript) {
          console.info((await boxen).default([
            "Restoring the original package.json. Build artifacts (`*.dist.js`, etc.)",
            "will remain in place. Make sure you don't commit them! Add their extensions",
            "to `.gitignore` if you haven't already, and invoke this tool in `clean` mode",
            "to get rid of them.",
          ].join('\n'), { padding: 1, margin: 1 }))
        }
      }
    }
  }

  /** Remove output directories and output files */
  async function cleanAll () {
    await Promise.all([
      await cleanDirs(),
      concurrently(distExts.map(ext=>`rimraf *${ext}`))
    ])
  }

  async function cleanDirs () {
    return await concurrently(distDirs.map(out=>`rimraf ${out}`))
  }

  function readPackageJson () {
    const original    = readFileSync($('package.json'), 'utf8')
    const packageJson = JSON.parse(original)
    if (packageJson.ubik) throw new Error(
      `This is already the modified, temporary package.json. Restore the original and try again ` +
      `(e.g. "git checkout package.json")`
    )
    return { packageJson, restoreOriginalPackageJson }
    function restoreOriginalPackageJson () {
      writeFileSync($('package.json'), original, 'utf8')
    }
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
      console.info(`${tag} not found, proceeding...`)
      return tag
    }
  }

  async function isPublished (name, version) {
    const url = `https://registry.npmjs.org/${name}/${version}`
    const response = await fetch(url)
    if (response.status === 200) {
      console.log(`${name} ${version} already exists, not publishing:`, url)
      return
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
    console.info('Compiling TypeScript:')
    const result = await concurrently([
      // TS -> ESM
      `${TSC} --outDir ${esmOut} --target es2016 --module es6 --declaration --declarationDir ${dtsOut}`,
      // TS -> CJS
      `${TSC} --outDir ${cjsOut} --target es6 --module commonjs`
    ]).result
  }

  // If "type" === "module", .dist.js is used for the ESM files, otherwise for the CJS ones.
  function getExtensions (isESModule) {
    const usedEsmExt = isESModule ? distJsExt : distEsmExt
    const usedCjsExt = isESModule ? distCjsExt : distJsExt
    return { usedEsmExt, usedCjsExt }
  }

  async function flattenFiles (packageJson) {
    const isESModule = (packageJson.type === 'module')
    const { usedEsmExt, usedCjsExt } = getExtensions(isESModule)

    // Collect output in package root and add it to "files" in package.json:
    console.log('\nFlattening package...')
    const files = [
      ...collect(esmOut, '.js',   usedEsmExt),
      ...collect(cjsOut, '.js',   usedCjsExt),
      ...collect(dtsOut, '.d.ts', distDtsExt),
    ]
    packageJson.files = [...new Set([...packageJson.files||[], ...files])].sort()

    console.log('\nRemoving dist directories...')
    await cleanDirs()

    function collect (dir, ext1, ext2) {
      console.info(`\nCollecting from "${dir}/*${ext1}" into "./*${ext2}"`)
      const inputs  = readdirSync($(dir))
      const outputs = []
      for (const file of inputs) {
        if (file.endsWith(ext1)) {
          const srcFile = $(dir, file)
          const newFile = replaceExtension(file, ext1, ext2)
          console.log(`  Moving ${toRel(srcFile)} -> ${newFile}`)
          copyFileSync(srcFile, newFile)
          unlinkSync(srcFile)
          outputs.push(newFile)
        }
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
    packageJson.exports = { source: toRel(main) }
    if (isESModule) {
      packageJson.main            = toRel(esmMain)
      packageJson.exports.require = toRel(cjsMain)
      packageJson.exports.default = toRel(esmMain)
    } else {
      packageJson.main            = toRel(esmMain)
      packageJson.exports.import  = toRel(cjsMain)
      packageJson.exports.default = toRel(esmMain)
    }
  }

  async function patchESMImports (packageJson) {
    console.info('\nPatching ESM imports...')
    const isESModule = (packageJson.type === 'module')
    const { usedEsmExt } = getExtensions(isESModule)
    const declarationsToPatch = [
      'ImportDeclaration',
      'ExportDeclaration',
      'ImportAllDeclaration',
      'ExportAllDeclaration'
    ]
    for (const file of packageJson.files.filter(x=>x.endsWith(usedEsmExt))) {
      console.info('\nPatching', file)
      const source = readFileSync(file, 'utf8')
      const parsed = recast.parse(source)
      let modified = false
      for (const declaration of parsed.program.body) {
        if (!declarationsToPatch.includes(declaration.type)) continue
        const oldValue     = declaration.source.value
        const isRelative   = oldValue.startsWith('./') || oldValue.startsWith('../')
        const isNotPatched = !oldValue.endsWith(usedEsmExt)
        if (isRelative && isNotPatched) {
          const newValue = `${oldValue}${usedEsmExt}`
          console.info('  ', oldValue, '->', newValue)
          declaration.source.value = newValue
          modified = true
        } else {
          console.info('  ', oldValue)
        }
      }
      if (modified) {
        writeFileSync(file, recast.print(parsed).code, 'utf8')
      }
    }
  }

  async function patchCJSRequires (packageJson) {
    console.info('\nPatching CJS requires:')
    const isESModule = (packageJson.type === 'module')
    const { usedCjsExt } = getExtensions(isESModule)
    for (const file of packageJson.files.filter(x=>x.endsWith(usedCjsExt))) {
      console.info('Patching', file, '...')
      const source = readFileSync(file, 'utf8')
      const parsed = recast.parse(source)
      let modified = false
      recast.types.visit(parsed, {
        visitCallExpression (path) { // TODO: use path.parentPath to detect scope shadowing
          const { callee: { type, name }, arguments, loc: { start: { line, column } } } = path.value
          if (type === 'Identifier' && name === 'require') {
            if (arguments.length === 1 && arguments[0].type === 'Literal') {
              const value = arguments[0].value
              if (value.startsWith('./') || value.startsWith('../')) {
                const target = `${resolve(dirname(file), value)}.ts`
                console.info(`  require("${value}"): looking for `)
                if (existsSync(target)) {
                  const newValue = `${value}${usedCjsExt}`
                  console.info(`  require("${value}") -> require("${newValue}")`)
                  arguments[0].value = newValue
                  modified = true
                } else {
                  console.info(`  require("${value}"): ${relative(cwd, target)} not found, ignoring`)
                }
              }
            } else {
              console.warn(
                `Non-standard require() call encountered at ${file}:${line}:${column}. `+
                `This library only patches calls of the format "require('./my-module')".'\n` +
                `File an issue at https://github.com/hackbg/toolbox if you need ` +
                `to patch more complex require calls.`
              )
            }
          }
          this.traverse(path)
        }
      })
      if (modified) {
        writeFileSync(file, recast.print(parsed).code, 'utf8')
      }
    }
  }

}

// Entry point:
if (require.main === module) ubik(process.cwd(), ...process.argv.slice(2))
  .then(()=>process.exit(0))
  .catch(async ({name, message, stack})=>{
    // Format errors:
    const RE_FRAME = new RegExp("(file:///.+)(:\\d+:\\d+\\\))")
    const cwd   = process.cwd()
    const trim  = x => x.slice(3).replace(RE_FRAME, (y, a, b) => relative(cwd, fileURLToPath(a))+b)
    const frame = x => '  │' + trim(x)
    const error = `${name}: ${message}\n${(stack||'').split('\n').slice(1).map(frame).join('\n')}`
    console.error(error)
    process.exit(1)
  })
