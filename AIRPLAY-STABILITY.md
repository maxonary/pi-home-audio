# AirPlay stability — 2026-10-31

All three receivers had Shairport Sync 5.6 / NQPTP 1.2.9 (smi11).
Recent logs on all three showed buffered-audio lead times around 44818 seconds.
Upstream 5.6.2 fixes signed RTP timestamp overflow after about 12.5 hours,
a strong match for these symptoms, but audible playback still requires testing.

Release: https://github.com/mikebrady/shairport-sync/releases/tag/5.6.2
Pinned commit: 0a34fbda83724cc06266aadcf7c88acc8fef4e7d

## Build and install

Source/build logs on each Pi: `/home/pi/pi-audio-5.6.2/`.
Built with the previous build's `config.status --config` arguments to retain
ALSA, metadata and Office PipeWire support and the correct config directory.
No `make install`: only the executable was replaced, keeping existing units,
configuration, volume behaviour and audio device selection.

`scripts/install-airplay-5.6.2.sh` installs an already-built binary, saves the old
binary at `/var/backups/pi-home-audio/pre-5.6.2/shairport-sync`, and adds:

- NQPTP `Restart=on-failure`, five-second delay.
- Shairport `Requires`, `After`, `PartOf=nqptp.service` so timing-service
  restarts propagate to the receiver.

This handles service failure; it is not a watchdog for every silent session.
No scheduled nightly restarts were added.

## Gallery Wi-Fi

Gallery is Wi-Fi only, with a strong signal (-47 dBm at inspection).
Power saving was enabled. Disabled immediately with `iw` and persistently via
`/etc/NetworkManager/conf.d/90-airplay-powersave.conf`:

```ini
[connection]
wifi.powersave=2
```

Gallery recorded historical thermal throttling (`0x80000`), but no current
throttling. Temperatures at inspection: Gallery 54.8 C, Bedroom 39.7 C,
Office 38.4 C. Consider better ventilation; Ethernet would remove the Wi-Fi hop.
Bedroom has Ethernet and Wi-Fi active; its router route uses Ethernet.
No network addresses or interfaces were changed.

## Rollback

Stop Shairport, restore the saved binary, remove only `recovery.conf` under
`nqptp.service.d` and `timing-recovery.conf` under `shairport-sync.service.d`,
reload systemd, restart NQPTP, then start Shairport.
To restore Gallery Wi-Fi defaults, remove the power-saving override and reboot
or reload NetworkManager configuration; immediate `iw ... set power_save on`
restores the former live setting.

## Verification

Confirm running binary version, both services active, audio hardware detected,
and AirPlay/mDNS advertisements. Then test Mac playback to one room followed
by all three. A long-duration test crossing 12.5 hours remains necessary to
verify the specific overflow no longer occurs in this installation.
