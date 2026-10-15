# Bedroom: upstream Shairport Metadata Display

Source: https://github.com/AlainGourves/shairport-metadata-display
Revision: 9da10d1f1ecfe3f20e1ba2ce31ffddd6bc23ae88 (MIT).
Installed under /home/pi/shairport-metadata-display; dependencies via npm lockfile.
ImageMagick installed through APT.

Service shairport-display, user pi, local-only HTTP/WebSocket 127.0.0.1:3600.
Only this service reads /run/bedroom-now-playing/metadata.
Previous custom bedroom-now-playing service is disabled, retained for rollback.
Kiosk service bedroom-display now points to port 3600.
Minimal source adaptation: bind server.listen to 127.0.0.1.
.env: production, existing FIFO, port3600, webp artwork, cache30.

Start a new AirPlay track if the source does not resend existing metadata.
This is an upstream metadata UI, not an exact Apple TV clone.

Idle correction: fix-idle.py removes the blocking French noInfo modal, adds an
English dark standby screen, and uses sans-serif track typography. Verified through
the live served page. Kiosk restarted to load it; no metadata was available at check.

AMLL frontend deployed under public/amll, kiosk URL /amll/.
Built from maxonary/applemusic-like-lyrics branch bedroom-airplay, example directory.
Build: VITE_METADATA_URL=/ npm run build -- --base=/amll/
Uses this same Node server/WebSocket at root; no second FIFO reader, proxy or service.
AMLL static quarter-resolution background default on Pi3; animation remains off.
Upstream display remains available at / for comparison/rollback.
Live metadata pipe sampled while music playing: no bytes in 3-second sample.
This does not establish that sender never sends metadata; fresh track/source check pending.
Frontend says Waiting for track details rather than incorrectly Not Playing.

AirPlay2 adapter: require('./airplay2-adapter')(pipeReader, metadataHealth) after reader
construction. Converts ssnc/copl binary-plist updateMRNowPlayingInfo into legacy
meta/PICT/progress events using Python stdlib plistlib. Fixture conversion checked.
Live counters show metadata reached receiver after fresh session (256531 bytes);
a subsequent pend stopped playback. Adapter awaits fresh live nowplaying packet.
Do not claim artwork/track display fixed until real track verified.
