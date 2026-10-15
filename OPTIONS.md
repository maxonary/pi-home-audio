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

Office now has a USB-C UAC2 gadget named **Office USB Audio**, configured for
stereo 24-bit / 48 kHz input. Mac playback becomes Pi capture and is routed
through PipeWire -> Office Equalizer -> X7 on USB-A. AirPlay uses the same EQ
sink. Both inputs can play together; pause the unused source to avoid mixing.

The boot overlay is added under `[pi4]`; earlier host settings belong to cm4
and cm5 sections and do not apply to this board. Gadget creation, live routing
and silent X7 playback worked before reboot. Physical Mac enumeration and
listening tests are pending. See OFFICE.md for current validation/recovery.

The Mac sees a standard USB audio device, not the X7's proprietary control
interface. The four USB-A sockets remain host ports. Use a USB-C data cable to
the Mac. The Pi currently uses that same USB-C socket for power: sufficient Mac
USB power must be established, or provide a suitable independent supply such
as PoE. Never join two power sources with a passive splitter. Latency and
multiroom sync need real playback verification after the routing change.

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
