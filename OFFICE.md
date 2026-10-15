# Office: USB audio and software equalizer

## Installed on pi4 (2026-10-15)

Mac USB-C -> UAC2 gadget -> PipeWire -> Office Equalizer -> USB Sound Blaster X7.
AirPlay Office -> Shairport Sync 5.6 native PipeWire backend -> same equalizer.
USB and AirPlay are mixed if both play. Pause the unused source. No Tailscale
or AI agent was installed.

USB descriptor: **Office USB Audio**, stereo 24-bit / 48 kHz, playback only
from the Mac. No microphone is offered. X7 stays on its USB-A socket.
The USB-C controller runs in peripheral mode; the four USB-A ports stay hosts.
The gadget uses Linux composite development IDs for this personal prototype;
these IDs must not be reused to distribute commercial hardware.

The Pi's USB-C socket currently supplies its power. To test Mac input, replace
that power connection with a USB-C **data** cable to a suitable Mac port. Mac
power sufficiency is unverified. Check `vcgencmd get_throttled` while playing.
If insufficient, use an appropriate independent power arrangement such as a
PoE HAT. Do not combine supplies with a passive power splitter.
On the Mac choose Office USB Audio in Sound output or Audio MIDI Setup.

## EQ and HomeKit

Default is Flat. Three bands are at 120 Hz (low shelf), 1.5 kHz (bell), and
6 kHz (high shelf), Q 0.707. Each gain accepts -6 to +6 dB. Positive gains
apply preamp attenuation equal to the sum of all boosts to reserve headroom.
This does not prevent clipping from mixing two full-level sources.

| Preset | Bass | Mid | Treble | Preamp |
| --- | ---: | ---: | ---: | ---: |
| Flat | 0 | 0 | 0 | 0 dB |
| Night | -6 | 0 | -2 | 0 dB |
| Speech | -3 | +2 | -2 | -2 dB |

Night reduces bass; it is not dynamic range compression. These are starter
presets, not measured room or speaker correction. Native X7 SBX/DSP is not
changed. Other X7 inputs that bypass the Pi do not receive this EQ.

Gallery's existing Homebridge hosts **Office EQ Flat**, **Office EQ Night**,
and **Office EQ Speech** switches. Turn a preset on to select it; turning a
selected preset off does not disable EQ. Existing X7 Volume still controls the
X7's real hardware Speaker volume/mute. PipeWire is configured not to change
that hardware mixer. The X7 output's software gain is unity; EQ attenuation
and AirPlay per-stream volume are separate.

CLI on pi4:

```sh
office-eq get
office-eq '{"preset":"flat"}'
office-eq '{"bass":-2,"mid":1,"treble":0}'
```

Authenticated API on port 8100 adds GET/POST `/eq` using the existing bearer
token. POST accepts a preset alone, or any subset of bass/mid/treble gains.
`/state` retains existing volume/mute behavior. Do not put tokens in Git.
EQ persists in `/var/lib/office-audio/eq.json` and restores at PipeWire startup.

## Files and services

- `/boot/firmware/config.txt`: appended `[pi4]` dwc2 peripheral block.
  Existing host directives under `[cm4]`/`[cm5]` are unrelated to this board.
- `/usr/local/sbin/office-usb-gadget`, system service `office-usb-gadget`:
  configfs UAC2 setup at boot, unbind on stop.
- `/home/pi/.config/pipewire/pipewire.conf.d/office-eq.conf`.
- `/home/pi/.config/wireplumber/wireplumber.conf.d/office.conf`:
  stable X7 sink name, hardware mixer bypass, X7 clock priority above gadget.
- User services `office-usb-input`, `office-eq-restore`, `pipewire`, `wireplumber`.
  `loginctl enable-linger pi` keeps them available without SSH login.
- `/etc/shairport-sync.conf`: `config/office-shairport-pipewire.conf`.
- `/etc/systemd/system/shairport-sync.service.d/office.conf`:
  runs as pi to share its PipeWire server at `/run/user/1000`.
- `/usr/local/bin/office-eq`: `scripts/office-eq.py`.
- X7 API unit allows writes only to `/var/lib/office-audio` in addition to
  runtime sockets; home directories are read-only for PipeWire client access.

Installed Debian packages: pipewire, pipewire-alsa, wireplumber,
libpipewire-0.3-dev and dependencies (including pipewire-pulse). Existing
Shairport 5.6 source was rebuilt with `--with-pipewire` alongside ALSA, so the
original direct ALSA config remains usable. `upgrade-airplay.sh` now preserves
this flag when it sees Office's PipeWire configuration.

For reconstruction copy the matching config/scripts/units above, enable the
system gadget unit and the user audio/restore/input units, enable pi linger,
and rebuild Shairport with its existing flags plus `--with-pipewire`.
Run `sudo systemctl daemon-reload` and `systemctl --user daemon-reload` after
unit changes. Homebridge plugin 0.2.0 enables switches with `officeEQ: true`.
Create `/var/lib/office-audio` owned by pi before starting the API.

## Validation and limitations

Verified: UAC2 capture card creation, full PipeWire links, silent stream through
EQ to X7, X7 streaming at 48 kHz, all services after reboot, non-flat preset
restoration after reboot, restoration after PipeWire restart, actual stereo
preamp gain of -2 dB for Speech, API reads/writes and invalid-value rejection,
Homebridge registration, unchanged 69% hardware volume after reboot, no
undervoltage on current supply. Final preset restored to Flat.

Pending: physical Mac USB enumeration, audible Mac input, power sufficiency
from Mac, audible AirPlay through changed backend, grouped AirPlay latency,
and sustained hotplug/clock-drift tests. The requested ~40 ms loopback latency
is not a measured end-to-end result. Do not claim USB playback tested until
the Mac cable is connected. X7 is the preferred clock driver to avoid the
unconnected gadget stalling output.

## Recovery

Backups on pi4: `/var/backups/pi-home-audio/pre-office-dsp/` contains original
boot config, direct ALSA Shairport configuration and binary. To return Office
to its former direct AirPlay path:

```sh
sudo systemctl stop shairport-sync
systemctl --user disable --now office-usb-input office-eq-restore
systemctl --user stop wireplumber pipewire pipewire-pulse.socket pipewire-pulse
sudo systemctl disable --now office-usb-gadget
sudo cp /var/backups/pi-home-audio/pre-office-dsp/shairport-sync.conf /etc/shairport-sync.conf
sudo cp /var/backups/pi-home-audio/pre-office-dsp/shairport-sync /usr/local/bin/shairport-sync
sudo rm /etc/systemd/system/shairport-sync.service.d/office.conf
sudo systemctl daemon-reload
sudo systemctl reset-failed shairport-sync
sudo systemctl start shairport-sync
```

Remove only the marked Office USB overlay block from boot config to disable
peripheral mode on the next reboot; preserve unrelated later edits. Disable
`officeEQ` in Gallery Homebridge config if reverting the EQ path. The volume
API remains independent. Do not restore the entire Gallery config unless
necessary: its dated backup may predate other user changes.

References: [Linux UAC2](https://docs.kernel.org/usb/gadget-testing.html#uac2-function),
[PipeWire filter chain](https://docs.pipewire.org/page_module_filter_chain.html),
[ALSA mixer properties](https://docs.pipewire.org/page_man_pipewire-props_7.html),
[Raspberry Pi gadget mode](https://www.raspberrypi.com/news/usb-gadget-mode-in-raspberry-pi-os-ssh-over-usb/).
