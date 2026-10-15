# Initial deployment validation — 2026-10-15

- All three Pis accept SSH public-key login as `pi`.
- Pi 4 enumerates Creative X7 `041e:323a`, ALSA card `X7`, hardware PCM 0.
- A one-second silent stereo PCM stream successfully opened the X7 USB device
  at 48 kHz, S16_LE. Audible playback still requires user confirmation.
- Shairport Sync was built with AirPlay 2, ALSA and soxr; NQPTP is installed.
- Pi 4 was rebooted. `shairport-sync`, `nqptp` and `x7-api` are all enabled
  and active after reboot. Bonjour again advertises `Sound Blaster X7`.
- X7 API reads volume/mute, successfully writes volume, mutes and unmutes.
  Original volume/mute state was restored. Unauthenticated requests return 401;
  volume 101 returns 400.
- Gallery Homebridge loaded the plugin and registered `Gallery USB Light`
  and `X7 Volume`. Existing SwitchBot accessory was restored from cache.
- Running the installed plugin as the real `homebridge` user successfully reads
  the USB power state and reads/writes X7 volume after Pi 4's reboot.
- Gallery USB power reported off then on during a two-second cycle. Physical
  lamp switching still requires user confirmation. AirPlay remained active.
- Bedroom Shairport Sync, NQPTP, Homebridge and Katana API are active.
  Katana is absent from `lsusb`; `/health` reports unavailable. Its USB cable
  and power must be checked before testing Katana controls.
- Gallery's original Homebridge config was backed up before mutation.
  Existing AirPlay configurations on Gallery and Bedroom were not changed.
- Python compilation and Node syntax checks pass for the new code.

Not verified: audible AirPlay playback, multiroom synchronization, physical lamp
response, Home app interaction, Katana hardware controls, X7 input/DSP/power
commands (not implemented). HomeKit X7 on/off means mute/unmute.

## Follow-up repairs and user feedback

- User confirms Gallery USB light physically switches and X7 audio plays.
- User reports Gallery loudness fluctuations; not yet resolved by listening.
- Katana is now enumerated (`041e:3247`); API health is `ok`, firmware/input/
  volume/lighting queries succeed. All queried EQ registers report unsupported.
- Bedroom AirPlay had exited because `/dev/shm/nqptp` was missing despite the
  daemon being alive. Restart restored it. Dedicated NQPTP account, explicit
  dependency, stable Katana ALSA identifiers and a nonblocking hotplug rule
  were deployed. Timing file remains readable by the Shairport service user
  across subsequent SSH login/logout; both services stay active.
- Gallery now runs Shairport without root, using `vernier` interpolation;
  forced mixer reset removed and volume/statistics logging enabled. Configuration
  was accepted, NQPTP is online and Homebridge remains active.
- Bonjour discovery lists Bedroom, Gallery and Sound Blaster X7 again.
- Existing working X7 audio settings and HomeKit USB light control were retained.
- Pi 4 kernel contains UAC2 gadget support, but its USB-C controller is currently
  configured for host mode. Mac USB audio was assessed, not activated or tested.

## Multiroom switching investigation and stable-release update

User reported Bedroom sometimes silent after switching a three-speaker group.
At inspection the process and timing service were alive, Katana input was
`computer`, volume 75%, unmuted; the AirPlay control connection was established
but the USB playback PCM was closed. The earlier missing timing-file condition
was not present. Restart restored availability. User then reported that changing
volume in the Home app also restored playback. This implicates session/control
state but does not establish a definitive root cause.

Shairport Sync 5.6 (released 2026-10-14) specifically improves group master-clock
changes and fixes unexpected session stops triggered by other players. All
three receivers were built from tag 5.6 with NQPTP tag 1.2.9, matching smi11.
Tagged source hashes are in `config/source-versions.json`. Previous binary
pairs are retained on each Pi under `/var/backups/pi-home-audio/pre-5.6/`.
Active configuration and existing systemd/Homebridge services were preserved.
Both timing/audio services were checked after installation. Bedroom also now
logs volume and stream diagnostics to the journal.

Repeated grouped playback/switching and audible synchronization require the
user's next listening test; service health alone does not prove the intermittent
problem is resolved. The upgrade script's shell syntax was checked before use.
