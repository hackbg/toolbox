# `@hackbg/toolbox` contribution guidelines

* Use [PNPM Workspaces](https://pnpm.io/workspaces).

* Give each package a release command in its `package.json`:

```json
{
  "scripts": {
    "release": "pnpm check && pnpm cov && pnpm exec ubik publish --access public --otp 123123`
  }
}
```

Don't add ts or ubik to dependencies or devDependencies from package,
let it use the ones from the workspace root package.

* Try to conform to [Semantic Versioning 2.0.0](https://semver.org/).

* Every version published to NPM should correspond to a tag `npm/@namespace/package/version`
  in the upstream.
