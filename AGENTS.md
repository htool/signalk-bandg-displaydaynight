# Agents

This plugin is becoming a **compat stub** for B&G display day/night. The survivor is [signalk-n2k-displays](https://github.com/htool/signalk-n2k-displays) on branch `showcase/instrument-lighting`.

Read that repo’s `AGENTS.md`, `docs/architecture.md`, and ADR 0001 / 0004 before changing this plugin.

## This repo

- Map old PUT `environment.displayMode.control` `{ mode, backlight: 1–10 }` onto `electrical.displays.*` intent paths.
- Do **not** emit PGN 130845 (no HEX `nmea2000out`).
- Do not add simpleCan.
- Feature F11 in the survivor `docs/features.md`.

Until F11 lands, this file is the warning: do not add new HEX or a second policy engine.
