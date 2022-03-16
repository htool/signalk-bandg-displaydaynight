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
    app.debug('Plugin started');
    app.debug('Schema: %s', JSON.stringify(options));

    var runMode = options['source'];
    var luxPath;
    if (typeof options.Lux != 'undefined') {
      luxPath = options.Lux['path'];
    }


    app.debug('runMode: %s', runMode);

    let localSubscription = {
      context: 'vessels.self',
      subscribe: [
      {
        path: 'environment.mode'         // For mode based
      },
      {
        path: 'environment.sun'          // For sun based
      },
      {
        path: luxPath                    // For lux based
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
          app.debug('u: %s', JSON.stringify(u));
          switch (runMode) {
            // Schema: {"source":"mode","Mode":{"dayLevel":1,"nightLevel":1},"Sun":{"dusk":{"mode":"day","backlight":1},"day":{"mode":"day","backlight":1},"sunset":{"mode":"night","backlight":1},"dawn":{"mode":"night","backlight":1},"night":{"mode":"night","backlight":1}},"Lux":{"path":"environment.outside.lux"}}
            case 'mode':
              if (u['values'][0]['path'] != 'environment.mode') break;
              var dayNight = u['values'][0]['value'];
		          if (dayNight == 'night') {
		            setDisplayMode(dayNight);
		            setBacklightLevel(options.Mode['nightLevel']);
		            app.debug('Setting display mode to %s and backlight level to %s', dayNight, options.Mode['nightLevel']);
		          } else {
		            setDisplayMode(dayNight);
		            setBacklightLevel(options.Mode['dayLevel']);
		            app.debug('Setting display mode to %s and backlight level to %s', dayNight, options.Mode['dayLevel']);
              }
              break;
            case 'sun':
              if (u['values'][0]['path'] != 'environment.sun') break;
              var sunMode = u['values'][0]['value'];
		          app.debug('environment.sun: %s', sunMode);
              var mode = options.Sun[sunMode]['mode'];
              var backlightLevel = options.Sun[sunMode]['backlight'];
		          app.debug('Setting display mode to %s and backlight level to %s', mode, backlightLevel);
		          setDisplayMode(mode);
		          setBacklightLevel(backlightLevel);
              break;
            case 'lux':
              if (u['values'][0]['path'] != luxPath) break;
              break;
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
    app.debug('Plugin stopped');
    unsubscribes.forEach(f => f());
    app.setPluginStatus('Stopped');
  };

  plugin.schema = {
    title: PLUGIN_NAME,
    type: 'object',
    properties: {
      source: {
        type: 'string',
        title: 'Select which source should be used to auto adjust the displays',
        enum: ['mode', 'sun', 'lux'],
        enumNames: ['Mode based', 'Sun based', 'Lux based'],
        default: 'mode'
      },

      Mode: {
        title: 'Mode based settings',
        description: 'Adjust the display mode based on `environment.mode` (derived-data). Below the backlight level can be set for day and night mode.',
        type: 'object',
        properties: {
          dayLevel: {
            type: 'number',
            title: 'Backlight level in day mode (1-10)',
            default: 6,
          },
          nightLevel: {
            type: 'number',
            title: 'Backlight level in night mode (1-10)',
            default: 3,
          }
        }
      },

      Sun: {
        title: 'Sun based settings',
        description: 'Adjust the display mode based on `environment.sun` (derived-data). Below the display mode and backlight level can be set for each mode.',
        type: 'object',
        properties: {

          dawn: {
            type: 'object',
            title: 'Dawn',
            properties: {
              mode: {
                type: 'string',
                title: 'Select day or night mode',
                enum: ['day', 'night'],
                enumNames: ['Day', 'Night'],
                default: 'night'
              },
              backlight: {
                type: 'number',
                title: 'Backlight level in nightmode (1-10)',
                default: 4,
              },
            },
          },

          sunrise: {
            type: 'object',
            title: 'Sunrise',
            properties: {
              mode: {
                type: 'string',
                title: 'Select day or night mode',
                enum: ['day', 'night'],
                enumNames: ['Day', 'Night'],
                default: 'day'
              },
              backlight: {
                type: 'number',
                title: 'Backlight level in nightmode (1-10)',
                default: 4,
              },
            },
          },

          day: {
            type: 'object',
            title: 'Day',
            properties: {
              mode: {
                type: 'string',
                title: 'Select day or night mode',
                enum: ['day', 'night'],
                enumNames: ['Day', 'Night'],
                default: 'day'
              },
              backlight: {
                type: 'number',
                title: 'Backlight level in day mode (1-10)',
                default: 6,
              },
            },
          },

          sunset: {
            type: 'object',
            title: 'Sunset',
            properties: {
              mode: {
                type: 'string',
                title: 'Select day or night mode',
                enum: ['day', 'night'],
                enumNames: ['Day', 'Night'],
                default: 'day'
              },
              backlight: {
                type: 'number',
                title: 'Backlight level in nightmode (1-10)',
                default: 4,
              },
            },
          },

          dusk: {
            type: 'object',
            title: 'Dusk',
            properties: {
              mode: {
                type: 'string',
                title: 'Select day or night mode',
                enum: ['day', 'night'],
                enumNames: ['Day', 'Night'],
                default: 'night'
              },
              backlight: {
                type: 'number',
                title: 'Backlight level in day mode (1-10)',
                default: 4,
              },
            },
          },

          night: {
            type: 'object',
            title: 'Night',
            properties: {
              mode: {
                type: 'string',
                title: 'Select day or night mode',
                enum: ['day', 'night'],
                enumNames: ['Day', 'Night'],
                default: 'night'
              },
              backlight: {
                type: 'number',
                title: 'Backlight level in nightmode (1-10)',
                default: 2,
              },
            },
          },

        },
      },
            
      Lux: {
        title: 'Lux based settings',
        description: 'Adjust the display mode based on `environment.outside.lux`. Below the display mode and backlight level can be added per lux range.',
        type: 'object',
        properties: {
          path: {
            type: 'string',
            title: 'Path to outside lux value',
            default: 'environment.outside.lux'
          },
          table: {
            type: 'array',
            title: 'Table entries',
            items: {
              type: 'object',
              properties: {
                luxMin: {
                  type: 'number',
                  title: 'Minimal lux (lux) level'
                },
                luxMax: {
                  type: 'number',
                  title: 'Max lux (lux) level'
                },
                dayNight: {
                  type: 'string',
                  title: 'Mode',
                  enum: ['day', 'night'],
                  enumNames: ['Day', 'Night'],
                  default: 'day'
                },
                backlightLevel: {
                  type: 'number',
                  title: 'Backlight level (1-10)',
                  default: 2
                }
              }
            }
          }
        }
      }
    }
  };

  return plugin;
};
