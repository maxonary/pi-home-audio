# Native X7 USB preparation

Current X7 still on Office Pi4; physical Pi swap deferred by user until tomorrow.
Wired Mac input is out of current scope. No host-role migration performed yet.

Added scripts/x7-native.py and installed /usr/local/bin/x7-native on Office.
Auto-detects only VID041e/PID323a HID. Defaults to dry run; --apply sends writes.
Live read-only headphone-jack query succeeded: USB verified, no headphone inserted.
Prepared encoders: Surround, Crystalizer, Dialog Plus, Smart Volume switches/amounts,
Smart Volume modes, native ten-band EQ/level/enable, speakers/headphones routing.
DSP writes are not yet verified against the physical device and are NOT exposed as
working HomeKit controls. The CLI explicitly reports readbackVerified:false.

Protocol reference: https://github.com/alcatron/mb-x7-control/blob/main/PROTOCOL.md
Independent implementation; no vendor binaries or borrowed application code.
Do not confuse ALSA Capture controls with hardware playback-source selection.
Avoid simultaneous hardware EQ and software boosts without headroom management.
No high-gain, amplification, reset, calibration or factory-default commands implemented.

Next: validate native effect writes against X7 app/device and retain restore values,
then add verified controls to API/Homebridge. Preserve bridge identities at Pi swap.
