# signalk-bandg-displaydaynight
Auto adjust the display mode (night/day/backlight) based on different modes.

### Run Modes
The plugin currently supports 4 run modes:
#### Mode
This mode subscribes to ``environment.mode`` and will switch between day and night. Backlight level for both can be set.
#### Sun
This mode subscribes to ``environment.sun`` and will switch between nautical dawn, dawn, sunrise, day, sunset, dusk, nautical dusk, and night. Diplay mode and backlight level can be set for all.

#### Lux
This mode subscribes to a path providing the outside lux value and allows diplay mode and backlight level to be set for a lux range.

Commands are send out as N2K packets.

#### None / External
This mode doesn't do any automatic adjustment of the display mode or backlight, however you can use the PUT interface to manually change it with something like Node-RED.  The path is: 'environment.displayMode.control'.  The API expects a JSON object with 3 parameters:

* mode: day or night
* backlight: 1-10
* (optional) group: Default, or 1-6

Examples:
```javascript
{"mode":"day", "backlight":"10"}
{"mode":"night", "backlight":5}
{"mode":"night", "backlight":1, "group": 1}
```

Here is an example flow for Node-RED:
```javascript
[{"id":"74db8643c2f49eaf","type":"inject","z":"2ecf05826ff4ea59","name":"day / 10","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"mode\":\"day\", \"backlight\":\"10\"}","payloadType":"json","x":120,"y":40,"wires":[["6f20c28b95f402f4"]]},{"id":"6f20c28b95f402f4","type":"signalk-send-put","z":"2ecf05826ff4ea59","name":"Change B&G display","path":"environment.displayMode.control","source":"","x":420,"y":100,"wires":[]},{"id":"5124c332bde80c2b","type":"inject","z":"2ecf05826ff4ea59","name":"night / 5","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"mode\":\"night\", \"backlight\":5}","payloadType":"json","x":120,"y":80,"wires":[["6f20c28b95f402f4"]]},{"id":"441ce8cdcb562692","type":"inject","z":"2ecf05826ff4ea59","name":"night / 1","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"mode\":\"night\", \"backlight\":1}","payloadType":"json","x":120,"y":120,"wires":[["6f20c28b95f402f4"]]},{"id":"5469b202682dc3a1","type":"inject","z":"2ecf05826ff4ea59","name":"group 1 / night / 1","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"mode\":\"night\", \"backlight\":1, \"group\": 1}","payloadType":"json","x":150,"y":160,"wires":[["6f20c28b95f402f4"]]}]
```
### Group Configuration
B&G Devices can be configured to operate in one of up to 7 Network Groups(Default, 1-6).  The plugin config is created on a per network group basis.  Each netowrk group can operate under different modes and have different backlight settings.  

#### Update display mode only when environment.mode / environment.sun changes Checkboxes
Checking the checkbox causes the plugin to *not* re-apply brightness settings unless the path value actually changes (i.e., Night->Nautical Dusk in sun run mode, or Day to Night in mode run mode).

The Signalk path environment.mode (run mode = Mode) and environment.sun (run mode = Sun) are used by this plugin as the input to determine what brightness levels should be sent.  These values are typical created by the Derived Data plugin and sent out every 60 seconds, regardless of if the value has changed.  
Unless this checkbox is checked:
- This plugin will see those deltas arrive and act on them, re-calculating and re-applying the brightness settings on display.
- If a user overrides a display brightness on a B&G device, the display brightness will revert back when the next envirnment.mode / environment.sun message arrives and is processed.

#### Device Power-on Resync
By using the Device Power-On ReSync, devices that are in a group with a setting of "Update Display mode only on environment.sun/mode changes" checked, will not have to wait for a change in the environment.sun or environment.mode deltas after they are powered on in order to take the backlight setting they should for the current time of day.

In order to use the feature, the plugin must be configured with a path that begins transmitting when the device (typically a Chartplotter) first powers on.  For the B&G Zeus 3S, very little is transmitted prior to the user accepting the User Agreement, however navigation.currentRoute.name is one that can be used, even is a route is not being followed. It should also be noted that if any Source Priorities are configured in the Server Connections, lower priority deltas for the path will not be seen by this plugin as Source Priorities acts as a smart, dynamic message filter at a low level within SignalK.

If the Chartplotter was last used at night and then turned off, the chartplotter will power on in what could be a very dark mode of operation.  With this section configured, the plugin will notice the path appear and immediately send out a backlight update so that the display brightness is quickly corrected to be accurate for the current time of day.

##### How to determine the best path to use
In order to determine a path that appears as early as possible, follow these steps:
1. Turn on the Chartplotter in question.
2. Allow it get to any user prompt requiring a press to proceed, but do not press Ok/accept.
3. Using the SignalK Data Browser, find the NMEA source(s) for your chartplotter, N2K.17, for example.
4. Enter the source (i.e., N2K.17), one at a time, into the Data Browser filter and see if any paths show up with timestamps that continue to update.
5. Continue through all sources until you find a path that exists at this point and use that in the plugin configuration. (NOTE, Path and Source are case sensitive.)
