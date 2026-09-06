# signalk-bandg-displaydaynight

Compat stub. Lighting policy lives in [signalk-n2k-displays](https://github.com/htool/signalk-n2k-displays) (`showcase/instrument-lighting`). Encode lives in [signalk-to-nmea2000](https://github.com/SignalK/signalk-to-nmea2000). **This plugin does not emit PGN 130845.**

Keep the plugin enabled so existing Node-RED `signalk-send-put` flows on `environment.displayMode.control` still load. Prefer PUT on `electrical.displays.brightness` (0–1) and `electrical.displays.mode` (`day` | `night`) via n2k-displays.

## PUT (compat)

Path: `environment.displayMode.control`

```json
{"mode":"night", "backlight":3}
```

Maps onto:

- `electrical.displays.mode` = `night`
- `electrical.displays.brightness` = `0.3` (backlight ÷ 10)
- `environment.displayMode` = `{ mode, backlight }` (deprecated mirror)

`group` is ignored. Intent is vessel-wide. Long-term PUT is n2k-displays, not this path. See n2k-displays [displayMode-compat.md](https://github.com/htool/signalk-n2k-displays/blob/showcase/instrument-lighting/docs/displayMode-compat.md).

Example Node-RED flow (same path as before):

```javascript
[{"id":"74db8643c2f49eaf","type":"inject","z":"2ecf05826ff4ea59","name":"day / 10","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"mode\":\"day\", \"backlight\":\"10\"}","payloadType":"json","x":120,"y":40,"wires":[["6f20c28b95f402f4"]]},{"id":"6f20c28b95f402f4","type":"signalk-send-put","z":"2ecf05826ff4ea59","name":"Change B&G display","path":"environment.displayMode.control","source":"","x":420,"y":100,"wires":[]},{"id":"5124c332bde80c2b","type":"inject","z":"2ecf05826ff4ea59","name":"night / 5","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"mode\":\"night\", \"backlight\":5}","payloadType":"json","x":120,"y":80,"wires":[["6f20c28b95f402f4"]]},{"id":"441ce8cdcb562692","type":"inject","z":"2ecf05826ff4ea59","name":"night / 1","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"mode\":\"night\", \"backlight\":1}","payloadType":"json","x":120,"y":120,"wires":[["6f20c28b95f402f4"]]},{"id":"5469b202682dc3a1","type":"inject","z":"2ecf05826ff4ea59","name":"group 1 / night / 1","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"mode\":\"night\", \"backlight\":1, \"group\": 1}","payloadType":"json","x":150,"y":160,"wires":[["6f20c28b95f402f4"]]}]
```

Time / sun / lux curves, maps, and the control webapp are in n2k-displays. Disable this plugin once nothing PUTs the old blob.
