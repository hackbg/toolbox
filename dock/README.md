# @hackbg/dock

Want to run something from Node in a reproducible environment? Use containers.

This package defines the `Dokeres`, `DokeresImage` and `DockeresContainer` classes.

Use `DockerImage` to make sure a specified Docker Image exists on your system,
pulling or building it if it's missing.

Request the same image to be built multiple times and
it's smart enough to build it only once. This lets you e.g.
launch a zillion dockerized tasks in parallel, while being
sure that the same Docker image won't be pulled/built a zillion times.

Reexports `Docker` from `dockerode` for finer control.

## Example

```typescript
await new Dokeres().image(
  'my-org/my-build-image:v1', // tries to pull this first
  '/path/to/my/Dockerfile',   // builds from this manifest if pull fails
).run(                                              // docker run                           \
  'build-my-thing', {                               //   --name build-my-thing              \
     readonly: { '/my/project/sources':   '/src'  } //   -v /my/project/sources:/sources:ro \
     writable: { '/my/project/artifacts': '/dist' } //   -v /my/project/sources:/sources:rw \
  }                                                 //   my-org/my-build-image:v1
)
```

<div align="center">

---

Made with #$%& @ [**Hack.bg**](https://foss.hack.bg)

</div>
