#!/usr/bin/env python3
"""Run as root on Office after installing Homebridge and the local plugin."""
import datetime,json,os,secrets,shutil
from pathlib import Path
base=Path('/var/lib/homebridge');p=base/'config.json';x=json.loads(p.read_text())
backup=Path('/var/backups/pi-home-audio/office-homebridge');backup.mkdir(parents=True,exist_ok=True,mode=0o700)
shutil.copy2(p,backup/('config-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.json'))
token=next(line.split('=',1)[1].strip().strip('"').strip("'") for line in Path('/etc/x7-api.env').read_text().splitlines() if line.startswith('X7_API_TOKEN='))
x['bridge']['name']='Homebridge Office'
platform={'platform':'PiHomeAudio','name':'Office X7 Controls','x7Host':'http://127.0.0.1:8100','x7Token':token,'officeEQ':False}
old=next((item for item in x.get('platforms',[]) if item.get('platform')=='PiHomeAudio'),{})
platform['_bridge']=old.get('_bridge') or {'username':'0E:'+':'.join(f'{b:02X}' for b in secrets.token_bytes(5)),'port':52301,'name':'Office X7 Controls'}
x['platforms']=[item for item in x.get('platforms',[]) if item.get('platform')!='PiHomeAudio']+[platform]
p.write_text(json.dumps(x,indent=2)+'\n');shutil.chown(p,user='homebridge',group='homebridge');os.chmod(p,0o600)
print('Configured Office X7 child bridge using the local loopback API; credentials not displayed.')
