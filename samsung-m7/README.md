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

Existing AirPlay/DAC audio route has NOT been switched to Ethernet. A continuous
AirPlay→HTTP audio stream bridge would be needed. Samsung buffering introduces
latency, so synchronized AirPlay grouping must be separately evaluated. Successful
file fetching alone does not establish gapless live-stream or multiroom sync.

The device reported Bluetooth input initially, despite the user's description of
an AUX connection. No assumption made that this model exposes analog AUX control.

Protocol references:
https://github.com/bacl/WAM_API_DOC
https://github.com/krygal/samsung_multiroom
