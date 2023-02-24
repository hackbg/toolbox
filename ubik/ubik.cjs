#!/usr/bin/env node

// Node natives
const {extname, resolve, basename, dirname, relative, join, isAbsolute} = require('path')
const {existsSync, readFileSync, writeFileSync, readdirSync, copyFileSync, unlinkSync} = require('fs')
const {execSync, execFileSync} = require('child_process')
const {request} = require('https')
const {fileURLToPath} = require('url')
const process = require('process')

// To bail early if the package is already uploaded
const fetch = require('node-fetch')

// To speed things up - runs ESM and CJS compilations in paralle
const concurrently = require('concurrently')

// To fix import statements after compiling to ESM
const recast    = require('recast')
const recastTS  = require('recast/parsers/typescript')
const acorn     = require('acorn')
const acornWalk = require('acorn-walk')
const astring   = require('astring')

// To draw boxes around things.
// Use with `(await boxen)` because of ERR_REQUIRE_ESM
const boxen = import('boxen')

// TypeScript compiler
const TSC = process.env.TSC || 'tsc'

// Temporary output directories
const dtsOut = 'dist/dts'
const esmOut = 'dist/esm'
const cjsOut = 'dist/cjs'
const distDirs = [dtsOut, esmOut, cjsOut]

// Output extensions
const distDtsExt = '.dist.d.ts'
const distEsmExt = '.dist.mjs'
const distCjsExt = '.dist.cjs'
const distJsExt = '.dist.js'
const distExts = [distDtsExt, distEsmExt, distCjsExt, distJsExt]

// Changes x.a to x.b:
const replaceExtension = (x, a, b) => `${basename(x, a)}${b}`

// Determine which package manager to use:
let packageManager = 'npm'
if (process.env.UBIK_PACKAGE_MANAGER) packageManager = process.env.UBIK_PACKAGE_MANAGER
try { execSync('yarn version'); packageManager = 'yarn' } catch (e) { console.info('Yarn: not installed') }
try { execSync('pnpm version'); packageManager = 'pnpm' } catch (e) { console.info('PNPM: not installed') }
console.info('\nUsing package manager:', packageManager)

// Export for programmatical reuse:
module.exports = module.exports.default = ubik

// Main function:
async function ubik (cwd, command, ...publishArgs) {

  console.log(`Ubik v${require(resolve(__dirname, 'package.json')).version}`)

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
    /** Whether to keep the modified package.json and dist files */
    keep = false
  ) {
    /** Need the contents of package.json and a way to restore it after modification. */
    const { packageJson } = readPackageJson()
    const { name, version } = packageJson
    /** First deduplication: Make sure the Git tag doesn't exist. */
    const tag = ensureFreshTag(name, version)
    /** Second deduplication: Make sure the library is not already published. */
    if (await isPublished(name, version)) return
    /** Print the contents of package.json if we'll be publishing. */
    console.log('\nOriginal package.json:', packageJson, '\n')
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
      const collectedFiles = await flattenFiles(packageJson)
      await patchPackageJson(packageJson)
      await patchESMImports(packageJson)
      await patchDTSImports(packageJson)
      await patchCJSRequires(packageJson)
      // Print the modified package.json and the contents of the package
      console.warn("\nBacking up package.json to package.json.real")
      copyFileSync($('package.json'), $('package.json.real'))
      console.warn("\nTemporarily making package.json look like this:", packageJson)
      copyFileSync($('package.json'), $('package.json.real'))
      writeFileSync($('package.json'), JSON.stringify(packageJson, null, 2), 'utf8')
      console.log()
      execFileSync('ls', ['-al'], { cwd, stdio: 'inherit', env: process.env })
      // Publish the package, thus modified, to NPM
      console.log(`\n${packageManager} publish --no-git-checks`, ...publishArgs)
      runPackageManager('publish', '--no-git-checks',  ...publishArgs)
      // Restore the original package.json and remove the dist files
      if (!keep) {
        console.warn("\nRestoring original package.json...")
        unlinkSync($('package.json'))
        copyFileSync($('package.json.real'), $('package.json'))
        unlinkSync($('package.json.real'))
        collectedFiles.forEach(file=>{ console.info(`Deleting ${file}`); unlinkSync(file) })
      } else {
        console.warn("\nKeeping modified package.json and dist files")
      }
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
          "WARNING: Not restoring original package.json; keeping built artifacts.",
          "Make sure you don't commit compilation results!",
          'On-demand compilation of TS might not work until you restore package.json.real',
        ].join('\n'), { padding: 1, margin: 1 }))
      } else {
        if (isTypeScript) {
          console.info((await boxen).default([
            "Restored the original package.json and deleting build artifacts.",
            "Use `ubik fix` if you want to keep them (e.g. if you want to publish a tarball).",
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
      console.info(`\nGit tag "${tag}" not found, proceeding...`)
      return tag
    }
  }

  async function isPublished (name, version) {
    const url = `https://registry.npmjs.org/${name}/${version}`
    const response = await fetch(url)
    if (response.status === 200) {
      console.log(`\n${name} ${version} already exists, not publishing:`, url)
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
    console.info('Compiling TypeScript:\n')
    const result = await concurrently([
      // TS -> ESM
      `${TSC} --outDir ${esmOut} --target es2016 --module es6 --declaration --declarationDir ${dtsOut}`,
      // TS -> CJS
      `${TSC} --outDir ${cjsOut} --target es6 --module commonjs`
    ]).result
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
    console.log('\nFlattening package...')
    const files = [
      ...collect(esmOut, '.js',   usedEsmExt),
      ...collect(cjsOut, '.js',   usedCjsExt),
      ...collect(dtsOut, '.d.ts', distDtsExt),
    ]
    packageJson.files = [...new Set([...packageJson.files||[], ...files])].sort()

    console.log('\nRemoving dist directories...')
    await cleanDirs()

    return collectedFiles

    function collect (dir, ext1, ext2) {
      console.info(`  Collecting from "${dir}/*${ext1}" into "./*${ext2}"`)
      const inputs  = readdirSync($(dir))
      const outputs = []
      for (const file of inputs) {
        if (file.endsWith(ext1)) {
          const srcFile = $(dir, file)
          const newFile = replaceExtension(file, ext1, ext2)
          console.log(`    Moving ${toRel(srcFile)} -> ${newFile}`)
          copyFileSync(srcFile, newFile)
          unlinkSync(srcFile)
          outputs.push(newFile)
          collectedFiles.add(newFile)
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
      'ExportAllDeclaration',
      'ExportNamedDeclaration'
    ]

    for (const file of packageJson.files.filter(x=>x.endsWith(usedEsmExt))) {

      console.info('  Patching', file)

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
          console.info('    ', oldValue, '->', newValue)
          declaration.source.value = newValue
          modified = true
        } else {
          console.info('    ', oldValue, '->', oldValue)
        }
      }

      if (modified) {
        writeFileSync(file, astring.generate(ast), 'utf8')
      }

    }

  }

  async function patchDTSImports (packageJson) {
    console.info('\nPatching DTS imports...')
    const declarationsToPatch = [
      'ImportDeclaration',
      'ExportDeclaration',
      'ImportAllDeclaration',
      'ExportAllDeclaration',
      'ExportNamedDeclaration'
    ]
    for (const file of packageJson.files.filter(x=>x.endsWith(distDtsExt))) {
      console.info('  Patching', file)
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
          console.info('    ', oldValue, '->', newValue)
          declaration.source.value = newValue
          modified = true
        } else {
          console.info('    ', oldValue, 'left as is')
        }
      }
      if (modified) {
        writeFileSync(file, recast.print(parsed).code, 'utf8')
      }
    }
  }

  async function patchCJSRequires (packageJson) {
    console.info('\nPatching CJS requires...')
    const isESModule = (packageJson.type === 'module')
    const { usedCjsExt } = getExtensions(isESModule)
    for (const file of packageJson.files.filter(x=>x.endsWith(usedCjsExt))) {

      console.info('  Patching', file)

      const ast = acorn.parse(readFileSync(file, 'utf8'), {
        ecmaVersion: process.env.UBIK_ECMA||'latest',
        sourceType: 'script',
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
                  console.info(`    require("${value}") -> require("${newValue}")`)
                  args[0].value = newValue
                  modified = true
                } else {
                  console.info(`    require("${value}"): ${relative(cwd, target)} not found, ignoring`)
                }
              } else {
                console.info(`    require("${value}") -> require("${value}")`)
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

        }

      })

      if (modified) {
        writeFileSync(file, astring.generate(ast), 'utf8')
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
