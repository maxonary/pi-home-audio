#!/usr/bin/env python3
"""Run as root on Gallery after installing the local plugin tarball."""
import datetime
import json
from pathlib import Path
import shutil

path = Path('/var/lib/homebridge/config.json')
config = json.loads(path.read_text())
backup = path.with_name('config.json.before-pi-home-audio-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
shutil.copy2(path, backup)
token = Path('/home/pi/.x7-api.env').read_text().strip().split('=', 1)[1]
platform = {
    'platform': 'PiHomeAudio', 'name': 'Pi Home Audio',
    'galleryLight': True, 'x7Host': 'http://192.168.2.132:8100', 'x7Token': token,
}
platforms = config.setdefault('platforms', [])
for i, old in enumerate(platforms):
    if old.get('platform') == 'PiHomeAudio':
        platforms[i] = platform
        break
else:
    platforms.append(platform)
# Preserve inode ownership and mode, including the existing HomeKit pairing.
path.write_text(json.dumps(config, indent=4) + '\n')
print('Updated Homebridge; backup:', backup)
