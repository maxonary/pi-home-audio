# Other home: Pi2 + Samsung M7 — 2026-10-16

Pi: pi@192.168.178.99 (Wi-Fi), hostname airplay, Pi2 ModelB Rev1.1,
Raspbian11/Bullseye32bit. Existing Shairport4.3.1 AirPlay2 receiver unchanged.
USB DAC is Creative Sound Blaster Play!2, VID041e/PID323d, ALSA cardS2.

## Direct Ethernet

Pi eth0 link-local169.254.122.95/16, MAC b8:27:eb:80:ef:34.
Speaker169.254.90.130, MAC50:85:69:c1:c3:99, Samsung SPK-WAM750, nameBruderreich.
These link-local addresses can change; rediscover over eth0 SSDP if needed.
Pi Wi-Fi remains the default route and SSH path. No DHCP server, bridge, routing,
firewall or Wi-Fi configuration was changed. The speaker does not need Internet
access for the demonstrated local command/file playback.

Read-only SSDP discovery on eth0 found Samsung description7676/smp_7_. It advertises
DIAL; a targeted standard MediaRenderer search got no reply during this test.
Native Samsung HTTP API port55001/UIC works over the same direct link.
Installed /usr/local/bin/m7ctl from this folder. `m7ctl status` reports current
volume/mute/input. `m7ctl volume 0..30`, `m7ctl mute on|off` use read-after-write
verification. Host override supported. Native API has no authentication: keep it
on this direct link/trusted LAN, do not expose it to the Internet.

Important firmware quirk: percent-encode spaces as%20, not+ in the cmd query.
Reads worked with urlencode, but setters containing spaces did not. The CLI uses
urllib.parse.quote(...,safe='') accordingly. Some setters don't acknowledge HTTP;
CLI rechecks live state instead of assuming a timeout means success.

## Verified network audio

SetUrlPlayback directed the M7 to a three-second silent stereo44.1kHz PCM WAV on
the Pi's169.254.122.95:8095 HTTP listener. The command returned resultok, the
speaker fetched /m7-network-test.wav from its Ethernet IP, and GetPlayStatus
reported functionwifi/submodecp. Restored originalbt input, volume0, muteoff.
No audible tone or volume increase. Temporary test server stopped afterward.
Test implementation is network-audio-test.py (uses only Python standard library).

The initial file test did not switch the AirPlay route. The continuous bridge
is now enabled as documented below. Samsung buffering introduces latency, so
synchronized AirPlay grouping and gapless behaviour still need separate evaluation.

The device reported Bluetooth input initially, despite the user's description of
an AUX connection. No assumption made that this model exposes analog AUX control.

Protocol references:
https://github.com/bacl/WAM_API_DOC
https://github.com/krygal/samsung_multiroom

## Live AirPlay Ethernet bridge enabled

Shairport rebuilt at the SAME4.3.1 source revision with --with-pipe added:
./configure --with-alsa --with-pipe --with-avahi --with-ssl=openssl --with-systemd
--with-metadata --with-airplay-2 --sysconfdir=/usr/local/etc ; make -j2
Existing receiver identity/default name retained; no AirPlay major-version upgrade.
Original binary/config/NQPTP unit are root-protected in /var/backups/m7-network/.

New path: AirPlay2 → Shairport pipe backend → /run/m7-network/audio → Python
HTTP WAV streamer → direct eth0 → M7 native SetUrlPlayback. No DAC is used by
this configured output. Bridge runs as shairport-sync in m7-network.service.
HTTP listens only on the direct Ethernet IP8095. /live.wav accepts the discovered
M7's IP only; /status reports counters. No write/control endpoint exposed via HTTP.

Service discovers current Pi link-local address and Samsung WAM750 via eth0 SSDP,
so neither link-local IP is hard-coded in the daemon. One speaker on this direct
link is assumed. systemd retries if networking isn't ready. No NAT/DHCP/bridging.
FIFO survives service restarts and is owned by shairport-sync with mode0660.
Pacing follows incoming PCM. A bounded2second ring avoids unlimited buffering.
After2seconds without PCM, streaming closes. New PCM triggers fresh playback;
missing/disconnected HTTP clients cause a retry after10seconds.
WAV: stereo16bit44100Hz; same output defaults as this Shairport pipe backend.
Header declares ~3h23m maximum duration to support firmware expecting a file length;
very long sessions and automatic reconnection at that boundary aren't validated.

Validation: continuous silence fed in real time for32seconds. M7 fetched stream,
bridge forwarded PCM, GetCurrentPlayTime advanced4→14→24seconds at source
10→20→30seconds. Thus actual live playback works, with roughly6seconds buffering
in this synthetic test. This is not an acoustic latency measurement or a guarantee
of synchronization with other AirPlay devices. Real sender listening test pending.

Existing NQPTP was running as interactive pi and its shared-memory object was gone.
Moved to dedicated nqptp system user with NET_BIND_SERVICE capability; restarted.
/dev/shm/nqptp now exists, Shairport logs NQPTP online; no post-fix restart loop.

Deploy mapping:
- airplay-network.py → /opt/samsung-m7/airplay-network.py
- m7-network.service → /etc/systemd/system/m7-network.service
- shairport-network.conf → /usr/local/etc/shairport-sync.conf
- shairport-network.service.conf → /etc/systemd/system/shairport-sync.service.d/m7-network.conf
- nqptp-service-user.conf → /etc/systemd/system/nqptp.service.d/service-user.conf
Enable m7-network and restart Shairport after systemctl daemon-reload.

rollback-audio.sh restores the original receiver binary/config, removes its bridge
dependency and disables the streamer. It deliberately retains the NQPTP user fix.

## Homebridge plugin references

Found cosminlupu/homebridge-samsung-multiroom0.1.1 and
isklikas/homebridge-http-speaker (npm homebridge-multiroom-speaker1.2.1).
Sources cloned for review; neither installed. This Pi currently has no active
Homebridge service. Modernization should use verified localAPI reads, serialize
commands, use%20 encoding, check writes and expose only verified speaker controls.
Network audio is independent of any future Homebridge plugin.

Final verified state: M7 inputwifi (network), hardware volume1/30, unmuted.
User explicitly requested a very quiet level. No further volume increase applied.

## AirPlay controls native M7 volume

Enabled at user's request. Shairport general.ignore_volume_control=yes keeps PCM
at full digital level. run_this_when_volume_is_set calls /usr/local/bin/m7-airplay-volume
(source airplay-volume.py), queuing a tiny atomic request in /run/m7-network/.
The network bridge coalesces slider updates and sends native SetVolume/SetMute
commands. Audio forwarding never waits on the speaker's volume HTTP response.
AirPlay -144dB requests hardware mute. -30..0 maps linearly to0..configured maximum.
Shairport may also mute PCM at its own mute endpoint, so unmute can still be affected
by already buffered silence; native command latency and audio recovery are distinct.

For the requested quiet setup, /etc/m7-network.json sets max_speaker_volume7 (out
of30), matching the current speaker level. This is an intentional cap: AirPlay100%
means M7volume7. To allow another range, edit that file (integer1..30) and restart
m7-network and shairport-sync. Do not raise it unexpectedly during playback.
Default on invalid/missing config remains7. No EQ or standby changes.

Verified native hook path: AirPlay mute request produced M7volume7/mutedtrue;
AirPlay0dB unmuted at7; subsequent readback confirmed7/false/networkinput. Mapping
and invalid-input checks pass. All services active, no receiver restart loop.
Final real slider movement should be checked by user; receiver was idle at test.

No Homebridge process/service found on this Pi, hence no local volume plugin was
removed. AirPlay volume no longer needs Homebridge. If a control exists on another
Homebridge installation, retire that accessory there separately after identifying it.
This is one-way control: M7 buttons/Samsung app changes don't synchronize back to
the sender's AirPlay slider. No speculative DACP feedback implementation is claimed.

Deployment additions:
- airplay-volume.py → /usr/local/bin/m7-airplay-volume (executable)
- m7-network.json → /etc/m7-network.json
- updated shairport-network.conf and airplay-network.py as above
Pre-native config retained at /var/backups/m7-network/before-native-volume.conf.
To undo only native-volume control, restore that config and restart Shairport;
the earlier software-attenuated Ethernet path will be restored.

### Local Homebridge on the Pi 2

The `homebridge-plugin` directory contains `homebridge-samsung-m7-local`.
Install it with Homebridge's bundled npm and configure accessory `SamsungM7Local`,
name `Samsung M7`, and `maxVolume: 7`. The volume appears as a dimmer because
Apple Home does not expose arbitrary standalone speaker volume sliders reliably.
Its on/off control toggles native mute; brightness controls native speaker volume
with 100% mapped to the configured cap (7 of 30 by default). Network and Bluetooth
switches select the speaker input. Turning an input switch off does nothing;
select the other input to change it. State refreshes every ten seconds.
AUX and SoundShare are not exposed until verified on this hardware.

Switching to Network selects the input; it does not start an AirPlay session.
Active AirPlay may reclaim the network input. Pair Homebridge once via the UI
at `http://192.168.178.99:8581`, then add its controls to the desired Home room.

Installed 2026-10-16 using the official Homebridge apt repository: package
2.0.20, Node 22.23.3, Homebridge 2.4.0 on Raspbian Bullseye armhf. Service
`homebridge` starts on boot. Plugin source lives in
`/opt/samsung-m7/homebridge-plugin`, installed with bundled npm into
`/var/lib/homebridge`; config is `/var/lib/homebridge/config.json`. Bridge
name is `Homebridge Bruderreich`, advertising on `wlan0`. The previous default
config is backed up at `config.pre-m7.json`. UI login creation and Apple Home
pairing are completed by the owner. No other home's bridges were changed.
