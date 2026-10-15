# Bedroom Now Playing

Apple Music-inspired fullscreen artwork, blurred background, track details and progress.
Reads the local Shairport Sync metadata FIFO; artwork and timing depend on sender support.
No playback buttons are shown because remote playback control is not implemented.

Files installed to `/opt/bedroom-now-playing/`. HTTP is local-only on port 8090.
Services: `bedroom-now-playing` (metadata/server), `bedroom-display` (HDMI kiosk).
The kiosk waits for a connected HDMI display. Katana remains the USB audio output.
Chromium runs as pi with its sandbox enabled. No external fonts, analytics or artwork requests.

`install.sh` expects server.py and index.html in /tmp. It backs up the previous
Shairport config under `/var/backups/pi-home-audio/pre-now-playing/`.
Dependencies: cec-utils xserver-xorg xinit xauth x11-xserver-utils chromium openbox.

Projector HDMI detection and CEC commands remain unverified until the projector
is powered on and HDMI reports connected. No HomeKit projector accessory yet.
