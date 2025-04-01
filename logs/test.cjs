;(async function testLogs () {
  const logsMjs = await import('./logs.mjs')
  const logsCjs = require('./logs.cjs')
  for (const [variant, { Console }] of Object.entries({logsMjs, logsCjs})) {
    for (const color of [true, false]) {
      for (const json of [true, false]) {
        console.log('\nTesting with', { variant, color, json })
        const logger = new Console("Testing!", {
          color,
          json,
          jsonLevelField: 'level',
          jsonMetaField:  'meta',
          jsonDataField:  'data',
        })
        for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace']) {
          logger[method]("hello")
          logger[method]({ json: "object", bigint: 100n })
          logger.table([["asdf","qwer"],["zxcv","uiop"]])
          logger.table([{asdf:"qwer"},{zxcv:"uiop"}])
          logger.table({foo:{asdf:"qwer"},bar:{zxcv:"uiop"}})
        }
      }
    }
  }
})()
