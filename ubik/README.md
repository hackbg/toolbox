<div style="text-align:center">

# `@hackbg/ubik`

Opinionated shim for publishing isomorphic TypeScript libraries to NPM,
in response to the current multilevel fragmentation of the JS packaging landscape.

</div>

---

## Setup

* Add to your `package.json`:

```json
{
  "devDependencies": {
    "@hackbg/ubik": "latest"
  },
  "scripts": {
    "ubik": "ubik"
  }
}
```

## Usage

* Edit package, increment version in package.json, commit
* Test if your package can be released: `pnpm ubik dry`
* Release into the wild: `pnpm ubik wet`

If publishing to tarball, use `pnpm ubik fix` in your CI.

## Features

* Does not remove sources from distribution.

* Does not compact all compiled code into a single file.

* Compiles TypeScript to both CommonJS and ESM targets.
  * Does not put the compilation output in a subdir.
  * Intelligently decides whether `.dist.js` will contain CJS or ESM
    depending on `type`  in `package.json`, and uses `.cjs` or `.mjs` for the other version.
  * Patches extensions to make the ESM build work in Node 16+.

* Publishes to NPM.
  * Modifies `package.json` during publication to point to the correct compile output for each mode.
  * Backs up the original in `package.json.real` and restores it after publishing the package.

* Adds a Git tag in the format `npm/$PACKAGE/$VERSION` and pushes it.
