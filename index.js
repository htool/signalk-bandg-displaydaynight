const util = require('util')
const PLUGIN_ID = 'signalk-bandg-displaydayNight';
const PLUGIN_NAME = 'Auto adjust B&G display mode';
var sourceAddress = 1; // Gets overwritten by candevice
var networkGroups = {
  'Default' : '01',
  '1'       : '02',
  '2'       : '03',
  '3'       : '04',
  '4'       : '05',
  '5'       : '06',
  '6'       : '07'}

var unsubscribes = [];

var lastState = {};

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
    lastState = {};

    //api for adjustments
    app.registerPutHandler('vessels.self', 'environment.displayMode.control', doChangeDisplayMode, PLUGIN_ID);

    let localSubscription = {
      context: 'vessels.self',
      subscribe: [
      {
        path: 'environment.mode'         // For mode based
      },
      {
        path: 'environment.sun'          // For sun based
      }
      ]
    }
    if (typeof options.config != 'undefined') {
      options.config.forEach(config => {
        localSubscription.subscribe.push(
        {
          path: config.Lux['path']  // For lux based
        })
      })
    }

    app.subscriptionmanager.subscribe(
      localSubscription,
      unsubscribes,
      subscriptionError => {
        app.error('Error:' + subscriptionError);
      },
      delta => {
        delta.updates.forEach(u => {
          app.debug('u: %s', JSON.stringify(u))
          var path = u['values'][0]['path']
          var value = u['values'][0]['value']
          options.config.forEach(config => {
            var runMode = config['source'];
            var group = config.group
            app.debug(`RunMode: ${runMode} group: ${group} luxPath: ${config.Lux['path']}`)
	          switch (runMode) {
	            case 'mode':
	              if (path != 'environment.mode') break;
	              var dayNight = value

                if (config.Mode['updateOnce']) {
                  if (dayNight == lastState[group])
                    break
                  lastState[group] = dayNight
                }

			          if (dayNight == 'night') {
			            setDisplayMode(dayNight, group)
			            setBacklightLevel(config.Mode['nightLevel'], group)
			            app.debug('Setting display mode to %s and backlight level to %s', dayNight, config.Mode['nightLevel'])
	                sendUpdate(dayNight, config.Mode['nightLevel'])
			          } else {
			            setDisplayMode(dayNight, group)
			            setBacklightLevel(config.Mode['dayLevel'], group)
			            app.debug('Setting display mode to %s and backlight level to %s', dayNight, config.Mode['dayLevel'])
	                sendUpdate(dayNight, config.Mode['dayLevel'])
	              }
	              break;
	            case 'sun':
	              if (path != 'environment.sun') break;
	              var sunMode = value
			          app.debug('environment.sun: %s', sunMode);

	              var mode = config.Sun[sunMode]['mode'];

                if (config.Sun['updateOnce']) {
                  if (sunMode == lastState[group])
                    break
                  lastState[group] = sunMode
                }

	              var backlightLevel = config.Sun[sunMode]['backlight'];
			          app.debug('Setting display mode to %s and backlight level to %s', mode, backlightLevel);
			          setDisplayMode(mode, group);
			          setBacklightLevel(backlightLevel, group);
	              sendUpdate(mode, backlightLevel)
	              break;
	            case 'lux':
	              if (path != config.Lux.path) break;
                config.Lux.table.forEach(element => {
                  if (Number(value) >= Number(element.luxMin) && Number(value) <= Number(element.luxMax)) {
                    var mode = element.dayNight
                    var backlightLevel = element.backlightLevel
			              app.debug('Setting display mode to %s and backlight level to %s', mode, backlightLevel);
			              setDisplayMode(mode, group);
			              setBacklightLevel(backlightLevel, group);
	                  sendUpdate(mode, backlightLevel)
                  }
                })
	              break;
	          }
          })
        })
      }
    );

    // Plugin code here
		
    function doChangeDisplayMode(context, path, value, callback)
    {
      app.debug("Change Display Mode PUT: " + JSON.stringify(value))
  
      //don't force group use
      if (!(value.group in networkGroups))
        value.group = 'Default';

      //did we send a mode?
      if (!(value.mode in ['day', 'night']))
      {
        app.debug(`Update display daynight mode: ${value.mode}`)
        setDisplayMode(value.mode, value.group)
      }
      
      //did we give a valid value?
      if (parseInt(value.backlight) >= 1 && parseInt(value.backlight) <= 10)
      {
        app.debug(`Update display backlight: ${value.backlight}`)
        setBacklightLevel(parseInt(value.backlight), value.group)
      }

      return { state: 'COMPLETED', statusCode: 200 };
    }    
    
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

    function setDisplayMode(mode, group) {
      app.debug('setDisplayMode: Using group: %s (%s)', group, networkGroups[group])
      var PGN130845_dayNight = "%s,3,130845,%s,255,0e,41,9f,ff,ff,%s,ff,ff,26,00,01,%s,ff,ff,ff"; // 02 = day, 04 = night
      if (mode == 'day') {
        var msg = util.format(PGN130845_dayNight, (new Date()).toISOString(), sourceAddress, networkGroups[group], '02');
        sendN2k([msg]);
      }
      if (mode == 'night') {
        var msg = util.format(PGN130845_dayNight, (new Date()).toISOString(), sourceAddress, networkGroups[group], '04');
        sendN2k([msg]);
      }
    }

    function setBacklightLevel(level, group) {
      app.debug('setBacklightLevel: Using group: %s (%s)', group, networkGroups[group])
      var PGN130845_backlightLevel = "%s,3,130845,%s,255,0e,41,9f,ff,ff,%s,ff,ff,12,00,01,%s,ff,ff,ff"; 
      var msg = util.format(PGN130845_backlightLevel, (new Date()).toISOString(), sourceAddress, networkGroups[group], intToHex(level*10));
      sendN2k([msg]);
    }

    function sendUpdate(mode, level) {
      var update = [{
        path: "environment.displayMode",
        value: {
          mode: mode,
          backlight: level
        }
      }]

      app.debug('Updating with: ' + JSON.stringify(update))
		  app.handleMessage(plugin.id, {
        updates: [
          {
            values: update
          }
        ]
      })
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
      config: {
        type: 'array',
        title: 'Add network group configs',
        items: {
          type: 'object',
          properties: {
			      group: {
			        type: 'string',
			        title: 'Network group',
			        enum: ['Default', '1', '2', '3', '4', '5', '6'],
			        enumNames: ['Default', '1', '2', '3', '4', '5', '6'],
			        default: 'Default'
			      },
			      source: {
			        type: 'string',
			        title: 'Select which source should be used to auto adjust the displays',
			        enum: ['mode', 'sun', 'lux', 'none'],
			        enumNames: ['Mode based', 'Sun based', 'Lux based', 'None / External (Use PUT interface)'],
			        default: 'mode'
			      },
			      Mode: {
			        title: 'Mode based settings',
			        description: 'Adjust the display mode based on `environment.mode` (derived-data). Below the backlight level can be set for day and night mode.',
			        type: 'object',
			        properties: {
			          updateOnce: {
			            type: 'boolean',
			            title: 'Update display mode only when environment.mode changes.',
			            default: true,
			          },
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
			          updateOnce: {
			            type: 'boolean',
			            title: 'Update display mode only when environment.sun changes.',
			            default: true,
			          },
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
        }
      }
    }
  }
  return plugin
}
