import { Engine, Image, Container } from './dock-podman'
import * as assert from 'node:assert'

const engine = new Engine()
assert.equal(engine.log.label, `@hackbg/dock: podman`)

const image = engine.image('tag')
assert.ok(image instanceof Image)
assert.equal(image.log.label, `image: tag`)
assert.equal(image.engine, engine)

const container = image.container('name')
assert.ok(container instanceof Container)
assert.equal(container.log.label, `container: name`)
assert.equal(container.image, image)
