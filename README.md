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
not switch the X7's physical power. Use the existing Gallery bridge pairing.

X7 volume/mute use verified ALSA `Speaker` controls. No speculative HID commands
are sent. Input routing, DSP/SBX and physical power are not implemented.

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
Use `config/x7-shairport-sync.conf` at `/etc/shairport-sync.conf`.
It selects `hw:CARD=X7,DEV=0` and the `Speaker` hardware mixer by stable name.
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

The two existing AirPlay installations are preserved. They have different
versions and tuning; upgrading them needs separate listening/sync validation.
