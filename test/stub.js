const assert = require('assert')
const fs = require('fs')
const path = require('path')
const createPlugin = require('../index')

const src = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8')
const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8')

assert.doesNotMatch(src, /nmea2000out/)
assert.doesNotMatch(src, /nmea2000JsonOut/)
assert.doesNotMatch(src, /130845/)
assert.doesNotMatch(src, /simpleCan/)
assert.doesNotMatch(src, /sendN2k/)
assert.match(readme, /signalk-n2k-displays/)
assert.match(readme, /does not emit PGN 130845/)

const messages = []
const puts = {}
const app = {
  debug: function () {},
  error: function () {},
  setPluginStatus: function () {},
  registerPutHandler: function (_ctx, skPath, fn) {
    puts[skPath] = fn
  },
  handleMessage: function (id, delta) {
    messages.push({ id, delta })
  }
}

const plugin = createPlugin(app)
assert.strictEqual(plugin.id, 'signalk-bandg-displaydayNight')
plugin.start({})
assert.ok(puts['environment.displayMode.control'])

function lastValue (skPath) {
  let last
  for (const m of messages) {
    const updates = (m.delta && m.delta.updates) || []
    for (const u of updates) {
      for (const v of u.values || []) {
        if (v.path === skPath) last = v.value
      }
    }
  }
  return last
}

const result = puts['environment.displayMode.control'](
  'vessels.self',
  'environment.displayMode.control',
  { mode: 'night', backlight: 3, group: 1 }
)
assert.strictEqual(result.statusCode, 200)
assert.strictEqual(lastValue('electrical.displays.mode'), 'night')
assert.strictEqual(lastValue('electrical.displays.brightness'), 0.3)
assert.deepStrictEqual(lastValue('environment.displayMode'), {
  mode: 'night',
  backlight: 3
})

const bad = puts['environment.displayMode.control'](
  'vessels.self',
  'environment.displayMode.control',
  { mode: 'dusk', backlight: 5 }
)
assert.strictEqual(bad.statusCode, 400)

plugin.stop()
console.log('ok')
