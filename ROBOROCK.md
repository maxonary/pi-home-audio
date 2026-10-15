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

## Corrected model and login compatibility

User screenshot identifies Q10 S5 / `roborock.vacuum.ss07`, not S7. Login is
still pending. Roborock's code-verification endpoint returned code 3039,
`password missing`, although the UI password input was filled: this plugin
version does not forward it during code verification. Local patch
`config/roborock-2.2.10-auth.patch` forwards that field transiently and retries
only an explicit 3039 response with a password encrypted using the existing
password-login algorithm. It never retries lock or rate-limit responses.

Backups of the three source files are under Gallery
`/var/backups/pi-home-audio/roborock-auth-fix/`. Only the settings backend was
terminated to reload changes; reload the browser before the next user login.
Mock tests verified code-only success, encrypted-password retry, and no retry
on a rate-limit response, with no real cloud authentication requests. Actual
authentication is unverified and needs the user's next attempt. This is a
local compatibility patch and is overwritten by npm reinstall/update.
To reapply against unmodified 2.2.10, run `patch -p1` in its package directory
with this patch file as input. Do not apply blindly to other versions.
