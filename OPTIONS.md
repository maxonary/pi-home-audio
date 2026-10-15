# Additional controls and Mac USB input

## Verified device-control limits

Katana is online and responds to firmware, input, volume and lighting queries.
Its existing API supports input selection, volume/mute, lighting and preset
profile commands. Firmware `2.0.171220.130` returned `unsupported` for all
queried EQ registers, including equalizer, crystalizer and surround. Do not
expose arbitrary EQ sliders using those unverified registers.

X7 exposes a working ALSA `Speaker` volume/mute mixer. Other enumerated
controls mainly relate to capture sources/gains; these are not evidence of
main playback input switching or DSP control. Native X7 EQ/SBX/input/power
control remains unimplemented and unverified. A software equalizer on the Pi
is an alternative, but only affects audio routed through it.

## Mac USB audio through Pi 4

Feasible architecture: Mac USB -> Pi 4 USB-C UAC2 audio gadget -> audio routing
and adaptive clock resampling -> X7 on a USB-A host port. Both UAC2 and dwc2
kernel support are present. The current boot config forces host mode
(`otg_mode=1`, `dtoverlay=dwc2,dr_mode=host`); no gadget changes were applied.

The Mac would see a new USB audio device provided by the Pi, rather than the
Creative X7's full vendor interface. macOS audio works through standard UAC2;
Creative's proprietary control application would not automatically work.
AirPlay and USB audio would need deliberate arbitration or mixing through a
shared audio server; two direct ALSA clients cannot own the same hardware PCM
at the same time. Latency requires measurement.

Use the Pi 4 USB-C device port, with a sufficient and appropriate power/data
arrangement. The X7 stays on the existing USB-A port. Do not connect a Mac to
a Pi host USB-A socket as a substitute. The installed Pi 3B+ models do not
offer the same straightforward USB gadget arrangement.

References:
- https://www.raspberrypi.com/documentation/computers/config_txt.html#otg_mode-raspberry-pi-4-only
- https://docs.kernel.org/next/usb/gadget-testing.html#uac2-function
- https://www.raspberrypi.com/news/usb-gadget-mode-in-raspberry-pi-os-ssh-over-usb/

## Geneva IR control

User description is consistent with a Geneva Model M-family speaker; exact
model is not confirmed. Gallery already has a BLE SwitchBot named GenevaPower,
but no IR devices are configured. The user reports the button pusher lacks
enough force.

Use an IR blaster/learning transmitter, not just an IR receiver. A SwitchBot
Hub Mini fits the already-installed Homebridge SwitchBot plugin, which supports
speaker power/volume and IR custom commands. Learn the original remote's
buttons. Custom bass/treble buttons can be mapped after codes are available;
IR does not provide authoritative current EQ/volume feedback. Avoid pretending
a toggle-only power code provides separate guaranteed on and off commands.

BroadLink RM4 Mini is an alternative for local LAN control, but the common
kiwi-cam Homebridge plugin was archived in September 2026; account for that
maintenance limitation before choosing it. No IR hardware was purchased or
configured.

References:
- https://www.genevalab.com/support
- https://github.com/OpenWonderLabs/homebridge-switchbot
- https://www.ibroadlink.com/productinfo/762674.html
- https://github.com/kiwi-cam/homebridge-broadlink-rm
