const util = require('util')
const PLUGIN_ID = 'signalk-bandg-displaydayNight';
const PLUGIN_NAME = 'Auto adjust B&G display mode';
var sourceAddress = 1; // Gets overwritten by candevice

var unsubscribes = [];

module.exports = function(app) {
  var plugin = {};
  var ws;

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = 'A plugin that auto adjusts B&G display mode';

  plugin.start = function(options, restartPlugin) {
    plugin.options = options;
    var dayNight;
    app.debug('Plugin started');

    let localSubscription = {
      context: 'vessels.self',
      subscribe: [{
        path: 'environment.mode' // For now
      }]
    };

    app.subscriptionmanager.subscribe(
      localSubscription,
      unsubscribes,
      subscriptionError => {
        app.error('Error:' + subscriptionError);
      },
      delta => {
        delta.updates.forEach(u => {
          dayNight = u['values'][0]['value'];
          if (dayNight == 'night') {
            setDisplayMode(dayNight);
            setBacklightLevel(options.Display['nightLevel']);
            app.debug('Setting display mode to %s and backlight level to %s', dayNight, options.Display['nightLevel']);
          } else {
            setDisplayMode(dayNight);
            setBacklightLevel(options.Display['dayLevel']);
            app.debug('Setting display mode to %s and backlight level to %s', dayNight, options.Display['dayLevel']);
          }
        });
      }

    );

    // Plugin code here
		
    function sendN2k(msgs) {
      app.debug("n2k_msg: " + msgs)
      msgs.map(function(msg) { app.emit('nmea2000out', msg)})
    }

    function padd(n, p, c)
    {
      var pad_char = typeof c !== 'undefined' ? c : '0';
      var pad = new Array(1 + p).join(pad_char);
      return (pad + n).slice(-pad.length);
    }

    function intToHex(integer) {
      var hex = padd((integer & 0xff).toString(16), 2)
      return hex
    }

    function setDisplayMode(mode) {
      var PGN130845_dayNight = "%s,3,130845,%s,255,0e,41,9f,ff,ff,01,ff,ff,26,00,01,%s,ff,ff,ff"; // 02 = day, 04 = night
      if (mode == 'day') {
        var msg = util.format(PGN130845_dayNight, (new Date()).toISOString(), sourceAddress, '02');
        sendN2k([msg]);
      }
      if (mode == 'night') {
        var msg = util.format(PGN130845_dayNight, (new Date()).toISOString(), sourceAddress, '04');
        sendN2k([msg]);
      }
    }

    function setBacklightLevel(level) {
      var PGN130845_backlightLevel = "%s,3,130845,%s,255,0e,41,9f,ff,ff,01,ff,ff,12,00,01,%s,ff,ff,ff"; 
      var msg = util.format(PGN130845_backlightLevel, (new Date()).toISOString(), sourceAddress, intToHex(level*10));
      sendN2k([msg]);
    }
		
    app.setPluginStatus('Running');
  };



  function listen(option) {
    let _notify = function(event) {
      app.debug('event: %j', JSON.stringify(option));
    };

    app.on(option.event, _notify);
    unsubscribes.push(() => {
      app.removeListener(option.event, _notify);
    });
  }

  plugin.stop = function() {
    // Here we put logic we need when the plugin stops
    ws.close();
    app.debug('Plugin stopped');
    unsubscribes.forEach(f => f());
    app.setPluginStatus('Stopped');
  };

  plugin.schema = {
    title: PLUGIN_NAME,
    type: 'object',
    properties: {
      Display: {
        type: 'object',
        properties: {
          dayLevel: {
            type: 'number',
            title: 'Backlight level in day mode (1-10)',
            default: 2
          },
          nightLevel: {
            type: 'number',
            title: 'Backlight level in night mode (1-10)',
            default: 3
          }
        }
      }
    }
  };

  return plugin;
};
