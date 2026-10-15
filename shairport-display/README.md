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
