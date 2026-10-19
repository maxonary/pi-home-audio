#!/usr/bin/env python3
"""Run on Gallery once Office X7 Controls is paired; install plugin 0.3.0 first."""
import datetime,json,shutil,os
from pathlib import Path
p=Path('/var/lib/homebridge/config.json');x=json.loads(p.read_text())
b=Path('/var/backups/pi-home-audio');b.mkdir(parents=True,exist_ok=True,mode=0o700)
backup=b/('config-before-office-x7-move-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.json');shutil.copy2(p,backup);os.chmod(backup,0o600)
for platform in x.get('platforms',[]):
 if platform.get('platform')=='PiHomeAudio':
  for key in ('x7Host','x7Token','officeEQ','galleryLight'):platform.pop(key,None)
p.write_text(json.dumps(x,indent=2)+'\n')
print('Gallery X7 forwarding removed; restart Homebridge to clear the cached X7 tile.')
