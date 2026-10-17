# D-Link cameras on the Bruderreich Pi 2

- DCS-932L: 192.168.178.38
- DCS-5010L: 192.168.178.43

Both respond to HTTP and require authentication. Video compatibility is pending
an authenticated test. Installed `@homebridge-plugins/homebridge-camera-ffmpeg`
4.1.0 with its bundled armv7 FFmpeg 8.0. Camera configuration is deliberately
not enabled until the owner supplies and verifies local camera credentials.

From the owner's Mac Terminal run:

```sh
ssh -t pi@192.168.178.99 'sudo python3 /opt/home-cameras/configure-dlink.py'
```

The helper prompts for local camera usernames and hidden passwords, checks each
`/video.cgi` stream, then writes both camera entries atomically and restarts
Homebridge. Failed validation leaves the live configuration unchanged. Passwords
are URL-encoded and stored only in Homebridge's local configuration, mode 0600;
never commit that file or print source URLs. Debug video logs should remain off.
The helper is deployed from `configure-dlink.py` in this directory.

Initial settings: 640x480 maximum, 10 fps maximum, 250 kbps, one live stream per
camera, ultrafast H.264 encoding, no audio. Test one camera at a time while audio
is playing; two simultaneous camera views on a Pi 2 are unverified. Snapshot
path `/image/jpeg.cgi` is provisional until authenticated tests. This setup
provides live views, not HomeKit Secure Video recording or native pan/tilt.
No camera firmware, port forwarding, or cloud settings were changed.
