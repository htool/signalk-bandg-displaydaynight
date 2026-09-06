# Agents

This plugin is a **compat stub** for B&G display day/night. The survivor is [signalk-n2k-displays](https://github.com/htool/signalk-n2k-displays) on branch `showcase/instrument-lighting`.

Read that repo’s `AGENTS.md`, `docs/architecture.md`, and ADR 0001 / 0004 before changing this plugin.

## This repo

- Map old PUT `environment.displayMode.control` `{ mode, backlight: 0–10 }` onto `electrical.displays.mode` and `.brightness`.
- Do **not** emit PGN 130845 (no HEX `nmea2000out`).
- Do not add simpleCan.
- Do not implement lighting policy (lux / sun / time). That is n2k-displays.
- Feature F11 in the survivor `docs/features.md`.
