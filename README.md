# signalk-bang-displaydaynight
Auto adjust the display mode (night/day/backlight) 

The plugin supports currently 2 modes:
### Mode
This mode subscribes to ``environment.mode`` and will switch between day and night. Backlight level for both can be set.
### Sun
This mode subscribes to ``environment.sun`` and will switch between dawn, sunrise, day, sunset, dusk and night. Diplay mode and backlight level can be set for all.

Coming:
### Lux
This mode subscribes to a path providing the outside lux value and allows diplay mode and backlight level to be set for a lux range.

Commands are send out as N2K packets.

Todo:
 - Add option to use lux range to set display mode and backlight level.
