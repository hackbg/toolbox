<div style="text-align:center">

# `@hackbg/izomorf`

Shim for publishing isomorphic TypeScript libraries to NPM,
in response to the current multilevel fragmentation of the JS packaging landscape.

Modifies package.json during publication of TypeScript packages
to make TS/ESM/CJS portability more seamless.

</div>

---

* Add to your `package.json`:

```json
{
  "devDependencies": {
    "@hackbg/izomorf": "latest"
  },
  "scripts": {
    "clean":       "izomorf clean",
    "release:dry": "npm run clean && izomorf dry",
    "release:wet": "npm run clean && izomorf wet --access=public"
  }
}
```

* Test if your package can be released:

```shell
pnpm run release:dry
```

* Release into the wild:

```shell
pnpm run release:wet
```

* Requires [PNPM](https://pnpm.io)

  * [ ] TODO: Make optional
