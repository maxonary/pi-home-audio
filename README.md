# Pi Home Audio

Shared configuration for Maximilian's three AirPlay receivers. The Katana driver
remains in https://github.com/maxonary/katanactl.

| Host | Address | Hardware |
| --- | --- | --- |
| Gallery / airplay-wohnzimmer | 192.168.2.71 | Pi 3B+, analog AUX, USB light, existing Homebridge |
| Bedroom / airplay | 192.168.2.89 | Pi 3B+, Katana API and existing Homebridge |
| pi4 | 192.168.2.132 | Pi 4B, USB Sound Blaster X7 (`041e:323a`) |

## HomeKit

The local `homebridge-pi-home-audio` plugin runs on Gallery's existing Homebridge.
It exposes **Gallery USB Light** (on/off) and **X7 Volume** (a dimmable light
accessory: brightness is speaker volume, on/off is unmute/mute). This follows
the same volume-slider representation as the existing Katana plugin. It does
not switch the X7's physical power. Pair the **Gallery Audio Controls** child bridge separately in Apple Home.
See [CHILD-BRIDGES.md](CHILD-BRIDGES.md).

Office also exposes three software EQ preset switches: **Office EQ Flat**,
**Office EQ Night**, and **Office EQ Speech**. See [OFFICE.md](OFFICE.md).

X7 volume/mute use verified ALSA `Speaker` controls. No speculative HID commands
are sent. Native X7 DSP/SBX and physical power are not implemented. Office now has a
software EQ and USB audio routing; see [OFFICE.md](OFFICE.md).

The X7 API requires a random bearer token in `/etc/x7-api.env` (root readable)
and the Gallery Homebridge platform config. Tokens and HomeKit pairing data
must never be committed. Port 8100 is intended for a trusted LAN; HTTP is
unencrypted. Do not expose it to the Internet.

## USB light

`scripts/gallery-light on|off|status` fixes the USB hub/port to `1-1`, port `2`.
On Pi 3B+ all external USB sockets share power, so this switches them together.
It does not switch the internal Ethernet controller's port. Gallery currently
has no enumerated external USB data devices and uses Wi-Fi.
Only this root-owned helper is allowed via passwordless sudo for Homebridge.
Physical light operation requires visual confirmation.

## AirPlay on pi4

Build NQPTP and Shairport Sync with AirPlay 2 from the upstream instructions:
https://github.com/mikebrady/shairport-sync/blob/master/BUILD.md
https://github.com/mikebrady/nqptp

Configure flags: `--sysconfdir=/etc --with-alsa --with-soxr --with-avahi
--with-ssl=openssl --with-systemd-startup --with-airplay-2`.
The AirPlay receiver is named **Office** (the device remains a Sound Blaster X7).
The original direct ALSA fallback is `config/x7-shairport-sync.conf`.
Office now uses `config/office-shairport-pipewire.conf` at `/etc/shairport-sync.conf`
with the additional `--with-pipewire` build flag.
The fallback selects `hw:CARD=X7,DEV=0` and the `Speaker` hardware mixer by stable name.
The upstream systemd units run the audio/timing services with limited privileges.

## Deployment and recovery

- X7 API source: `/opt/pi-home-audio/scripts/x7-api.py`.
- X7 API unit: `/etc/systemd/system/x7-api.service`.
- Gallery helper: `/usr/local/sbin/gallery-light`.
- Gallery sudo rule: `/etc/sudoers.d/gallery-light`.
- Plugin: `/var/lib/homebridge/node_modules/homebridge-pi-home-audio`.
- Homebridge config is backed up before adding the platform, under
  `/var/lib/homebridge/config.json.before-pi-home-audio-*`.

To roll back HomeKit additions, restore that backup and restart Homebridge.
To stop X7 control: `sudo systemctl disable --now x7-api`.
To stop pi4 AirPlay: `sudo systemctl disable --now shairport-sync nqptp`.
Do not delete Homebridge `persist/` or `accessories/` directories.

## Bedroom and Gallery repairs

Bedroom uses `config/bedroom-shairport-sync.conf` at
`/usr/local/etc/shairport-sync.conf`. It selects the Katana by stable name and
uses its real `Speakers` mixer. The old numeric-card retry hook was removed.
NQPTP runs as a dedicated system account `nqptp`, rather than the interactive `pi` account.
This protects timing shared memory from interactive-user IPC cleanup. The
Shairport service now depends on NQPTP. The hotplug rule starts the service
once per sound card instead of launching multiple blocking restart scripts.
Backups are under `/var/backups/pi-home-audio/` on Bedroom.

Gallery uses `config/gallery-shairport-sync.conf` and the matching systemd
override. It uses stable `Headphones` hardware names, `vernier` interpolation,
and retains its 70 ms latency offset. Shairport now runs as an audio-group
system user rather than root. The forced 100% mixer setting on service startup
was removed. Journal logging includes volume changes and stream statistics
for investigating reported volume fluctuations; these are not yet proven fixed.
Maximum analog output is capped at 0 dB rather than the built-in mixer's +4 dB
ceiling, avoiding digital gain above unity. This does not resolve analog hum.
Backups are under `/var/backups/pi-home-audio/` on Gallery.

## Matched stable releases

The target for all receivers is Shairport Sync **5.6** and NQPTP **1.2.9**,
both using timing interface **smi11**. Release 5.6 improves grandmaster changes
when speakers join/leave groups and fixes sessions unexpectedly stopping when
other players connect. See https://github.com/mikebrady/shairport-sync/releases/tag/5.6.

`scripts/upgrade-airplay.sh build` builds the tagged releases without modifying
the active binaries. `install` saves the existing binaries in
`/var/backups/pi-home-audio/pre-5.6/`, stops both services, installs the matched
pair, starts timing before audio, and checks service health. `rollback` restores
the saved pair. Run these as `pi`; installation uses sudo. Existing services,
device-specific configuration paths, Homebridge and USB controls are retained.

Build dependencies follow upstream BUILD.md. The install deliberately copies
binaries rather than replacing existing service/configuration files with
upstream sample files. Shell syntax was checked locally; all runtime and
playback validation is recorded in VALIDATION.md.

### Gallery Creative DAC migration (2026-10-18)

Gallery now outputs through the Sound Blaster Play! 2 (`hw:CARD=S2,DEV=0`),
using its `Speaker` hardware mixer. Its native format is stereo S16_LE/44100.
The initial maximum is conservatively capped at -20 dB, matching the DAC's
observed pre-migration level. The Geneva line-in cable must connect to the DAC's
headphone output rather than the Pi's analogue socket.

All external USB sockets share power on this Pi 3B+. Both USB lamps and the DAC
therefore cannot be switched independently using the onboard hub. The file
`/etc/gallery-usb-dac-active` makes `gallery-light off` fail with an explanatory
error instead of cutting DAC power; on/status remain available. This means the
existing light tile cannot turn the lamps off while the DAC is installed.
Do not remove that guard until lamp power is moved to independently controlled
hardware. A separate sunset-lamp accessory has not been added for this reason.

Backup: `/var/backups/pi-home-audio/gallery-usb-dac/`. Validation: ALSA silent
playback accepted, DAC remained connected when power-off guard was exercised,
and Shairport/Homebridge active. Audible playback remains to be confirmed by
the owner. After the power cycle the current undervoltage flags were zero;
previous-boot journal was not persistent, so the earlier outage cause is unknown.
