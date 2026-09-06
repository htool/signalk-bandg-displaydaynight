const PLUGIN_ID = 'signalk-bandg-displaydayNight'
const PLUGIN_NAME = 'Auto adjust B&G display mode'
const CONTROL_PATH = 'environment.displayMode.control'
const BLOB_PATH = 'environment.displayMode'
const INTENT_MODE = 'electrical.displays.mode'
const INTENT_BRIGHTNESS = 'electrical.displays.brightness'

function parseCompatPut (value) {
  if (!value || typeof value !== 'object') {
    return { ok: false, message: 'displayMode PUT needs { mode, backlight }' }
  }
  if (value.mode !== 'day' && value.mode !== 'night') {
    return { ok: false, message: 'mode must be day or night' }
  }
  const n =
    typeof value.backlight === 'string'
      ? Number(value.backlight)
      : value.backlight
  if (typeof n !== 'number' || !isFinite(n) || n < 0 || n > 10) {
    return { ok: false, message: 'backlight must be 0–10' }
  }
  return {
    ok: true,
    mode: value.mode,
    brightness: Math.round(n) / 10,
    backlight: Math.round(n)
  }
}

module.exports = function (app) {
  const plugin = {}

  plugin.id = PLUGIN_ID
  plugin.name = PLUGIN_NAME
  plugin.description =
    'Compat stub: maps environment.displayMode.control onto electrical.displays intent. Lighting policy is signalk-n2k-displays. Does not emit NMEA 2000.'

  plugin.start = function (options) {
    plugin.options = options
    app.debug('Plugin started (compat stub; does not emit NMEA 2000)')
    app.registerPutHandler(
      'vessels.self',
      CONTROL_PATH,
      doChangeDisplayMode,
      PLUGIN_ID
    )
    if (typeof app.setPluginStatus === 'function') {
      app.setPluginStatus(
        'Stub: PUT environment.displayMode.control → electrical.displays. Policy is signalk-n2k-displays.'
      )
    }
  }

  function publish (path, value) {
    app.handleMessage(plugin.id, {
      updates: [{ values: [{ path, value }] }]
    })
  }

  function doChangeDisplayMode (_context, _path, value) {
    const parsed = parseCompatPut(value)
    if (!parsed.ok) {
      return {
        state: 'COMPLETED',
        statusCode: 400,
        message: parsed.message
      }
    }
    publish(INTENT_MODE, parsed.mode)
    publish(INTENT_BRIGHTNESS, parsed.brightness)
    publish(BLOB_PATH, { mode: parsed.mode, backlight: parsed.backlight })
    return { state: 'COMPLETED', statusCode: 200 }
  }

  plugin.stop = function () {
    app.debug('Plugin stopped')
    if (typeof app.setPluginStatus === 'function') {
      app.setPluginStatus('Stopped')
    }
  }

  plugin.schema = {
    title: PLUGIN_NAME,
    description:
      'Compat stub. Enable signalk-n2k-displays for lighting policy. Old PUT environment.displayMode.control still maps onto electrical.displays.brightness (0–1) and .mode. This plugin does not emit NMEA 2000.',
    type: 'object',
    properties: {}
  }

  return plugin
}
