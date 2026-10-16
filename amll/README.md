# Bedroom Pi3 AMLL deployment — 2026-10-16

Pis stay in current positions. Pi3 handles Katana and projector; no migration.
Frontend source: https://github.com/maxonary/applemusic-like-lyrics/tree/bedroom-airplay/examples/bedroom-airplay
Build npm run build and copy dist into /home/pi/shairport-metadata-display/public/amll/.
Deploy server.py to /opt/bedroom-amll/server.py and the supplied system unit to
/etc/systemd/system/bedroom-amll.service. Local-only port3600 serves frontend plus
state snapshots, artwork and diagnostics. Kiosk URL remains http://127.0.0.1:3600/amll/.

Disable old shairport-display and bedroom-now-playing services before enabling
bedroom-amll: only one process may read the metadata FIFO. bedroom-display unit now
After/Wants bedroom-amll.service. The old frontend/server remain available for rollback.
FIFO /run/bedroom-now-playing/metadata is recreated by the existing tmpfiles rule,
owned shairport-sync:pi mode0660. Shairport metadata and cover art enabled; progress
heartbeat1s. Shairport and Katana audio configuration unchanged in this polish.

Uses AMLL static mesh background at20% render scale; no expensive continuous mesh
animation. Clear states, optional reliable timeline, artwork transition, three-line
long-title wrapping, projector safe margins, reduced-motion support.

Validation: build passes; Python gateway binary-plist/legacy metadata, merging,
pause/RTP/artwork/disconnect tests pass. HTTP page visually verified in browser.
Real sender-to-projector track/artwork check is still pending fresh playback.
Current gateway starts with empty state; no fake tracks are injected on the Pi.

Rollback: stop/disable bedroom-amll, enable/start shairport-display, restore
bedroom-display unit After/Wants shairport-display.service, then restart kiosk.
The prior frontend bundle is in git history; rebuild prior fork commit if needed.

Rotation settings: /settings.html saves to /var/lib/bedroom-amll/display.json.
Create folder with sudo install -d -o pi -g pi -m750 /var/lib/bedroom-amll.
Service needs ReadWritePaths=/var/lib/bedroom-amll (installed settings.conf drop-in).
Defaults remain0degrees/auto. All connected screens refresh saved rotation/layout
through the state snapshot; no kiosk restart needed. Preview links don't save.
Portrait composition stacks artwork above metadata and adapts logical viewport
units when rotated90/270degrees. Settings UI itself stays upright remotely.
