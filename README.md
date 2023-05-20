# signalk-bang-displaydaynight
Auto adjust the display mode (night/day/backlight) based on different modes.
Config can be created per network group.

The plugin supports currently 2 modes:
### Mode
This mode subscribes to ``environment.mode`` and will switch between day and night. Backlight level for both can be set.
### Sun
This mode subscribes to ``environment.sun`` and will switch between dawn, sunrise, day, sunset, dusk and night. Diplay mode and backlight level can be set for all.

### Lux
This mode subscribes to a path providing the outside lux value and allows diplay mode and backlight level to be set for a lux range.

Commands are send out as N2K packets.

### None / External
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
