const PLUGIN_ID = 'signalk-bandg-displaydayNight';
const PLUGIN_NAME = 'Auto adjust B&G display mode';
const WebSocket = require('ws')

var unsubscribes = [];

var eSettingId = {
    BacklightLevel: 1,
    NightMode: 2,
};
Object.freeze(eSettingId);

module.exports = function(app) {
  var plugin = {};

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = 'A plugin that auto adjusts B&G display mode';

  plugin.start = function(options, restartPlugin) {
    plugin.options = options;
    var dayNight;
    var mfdIP = options.MFD['ip'];
    app.debug('mfdIP: ' + JSON.stringify(mfdIP));
    var wsurl = "ws://" + mfdIP + ":2053";
    app.debug('wsurl: ' + wsurl);
    var ws = new WebSocket(wsurl);
    app.debug('Plugin started');

    let localSubscription = {
      context: 'vessels.self', // Get data for all contexts
      subscribe: [{
        path: 'environment.sun' // For now
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
          app.debug('Current mode: %s', dayNight);
          if (dayNight == 'night') {
		        setSetting(eSettingId.NightMode, true);
		        setSetting(eSettingId.BacklightLevel, 1); // 0 - 10
          } else {
		        setSetting(eSettingId.NightMode, false);
		        setSetting(eSettingId.BacklightLevel, 2);
          }
        });
      }

    );

    // Plugin code here
		
		
		function requestDeviceList (aDeviceType, includeMissingDevices) {   
		  includeMissingDevices = ( typeof includeMissingDevices !== 'undefined' ) ? includeMissingDevices : false;
		  var obj = {
		    "DeviceListReq": {
		      "DeviceTypes": aDeviceType,
		      "IncludeMissing": includeMissingDevices
		    }
		  };
		  send(obj);
		};
		
		function requestData (modes, repeat) {   
		  var obj = {
		    "DataReq": {
		      "id": modes,
		      "repeat": repeat
		    }
		  };
		  send(obj);
		};
		
		function requestSetting (aKeys, register) {
		  var obj = {
		    "SettingReq": {
		      "ids": aKeys,
		      "register": register
		    }
		  };
		  send(obj);
		}
		
		function subscribeEvent (aKeys) {
		  var oKeys=[];
		  oKeys.push(aKeys)
		  var obj = {
		    "EventReg": oKeys
		  };
		  app.debug("subscribeEvent " + JSON.stringify(obj));
		  send(obj);
		}
		
		function send (obj) {
		  app.debug("Sending: " + JSON.stringify(obj));
		  ws.send(JSON.stringify(obj));
		}
		
		function checkNightMode () {
		  requestSetting([eSettingId.NightMode], true);
		}
		
		function setSetting (key, value) {
		  var aSettings = [];
		  var setting = {
		      "id": key,
		      "value": value
		  };
		  aSettings.push(setting);
		  var obj = {
		      "Setting": aSettings
		  };
		  send(obj);
		};
		
		ws.onopen = () => {
		  app.debug(`WebSocket %s connected`, wsurl);
		  // requestSetting([eSettingId.BacklightLevel], true);
		  // requestSetting([eSettingId.NightMode], true);
		  // setSetting(eSettingId.NightMode, false);
		}
		 
		ws.onerror = (error) => {
		  app.debug(`WebSocket error: ${error}`)
		}
		 
		ws.onmessage = (e) => {
		  app.debug("Received: " + JSON.stringify(e.data))
		  msg = JSON.parse(e.data);
		}
		
    app.setPluginStatus('Running');
  };



  function listen(option) {
    let _notify = function(event) {
      // sendMessage('[NOTIFICATION] ' + option.message);
      app.debug('event: %j', JSON.stringify(option));
    };

    app.on(option.event, _notify);
    unsubscribes.push(() => {
      app.removeListener(option.event, _notify);
    });
  }

  plugin.stop = function() {
    // Here we put logic we need when the plugin stops
    //bot.close();
    app.debug('Plugin stopped');
    unsubscribes.forEach(f => f());
    app.setPluginStatus('Stopped');
  };

  plugin.schema = {
    title: PLUGIN_NAME,
    type: 'object',
    properties: {
      MFD: {
        type: 'object',
        properties: {
          ip: {
            type: 'string',
            title: 'B&G MFD IP'
          }
        }
      }
    }
  };

  return plugin;
};
