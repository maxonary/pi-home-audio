# Roborock S7

Installed `homebridge-roborock-vacuum` 2.2.10 on Gallery under
`/var/lib/homebridge/node_modules` alongside existing Homebridge 1.11.2.
Platform `RoborockVacuumPlatform` added with name `Roborock Vacuum`.
Roborock login and S7 discovery are pending user authentication in plugin UI.
Use standard HomeKit mode (fan-style accessory); Matter requires Homebridge 2.

Open Gallery Homebridge on port 8581, Plugins -> Roborock Vacuum -> Settings.
Sign in with the Roborock account using its UI (email verification supported),
load devices, select HomeKit for the S7, save and restart Homebridge.
Do not commit credentials or session tokens.

The existing audio plugin was packaged as 0.2.0 at
`/var/lib/homebridge/plugin-packages/homebridge-pi-home-audio-0.2.0.tgz` and its
npm dependency updated to this local package to prevent rollback to the old
0.1.0 tarball during installation of other plugins. Verified installed audio
plugin version 0.2.0 and Homebridge-user X7 read/write + lamp status checks.

Backups before setup: Gallery `/var/backups/pi-home-audio/pre-roborock/`
contains config.json and package.json (there was no package-lock.json).
Plugin loaded successfully and Homebridge UI returned HTTP 200. Actual vacuum
control remains untested until account login. No vacuum commands were sent.

Upstream: https://github.com/tasict/homebridge-roborock-vacuum
