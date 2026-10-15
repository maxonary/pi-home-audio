import datetime,json,os,secrets,stat,sys,tarfile
from pathlib import Path
role=sys.argv[1]
mappings={
 'gallery':{'SwitchBot':('Gallery SwitchBot',52101),'PiHomeAudio':('Gallery Audio Controls',52102),'RoborockVacuumPlatform':('Gallery Roborock',52103)},
 'bedroom':{'SoundBlasterKatana':('Bedroom Katana',52201),'SwitchBot':('Bedroom SwitchBot',52202)},
}[role]
base=Path('/var/lib/homebridge');p=base/'config.json';c=json.loads(p.read_text())
backup=Path('/var/backups/pi-home-audio')/('pre-child-bridges-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.mkdir(parents=True,mode=0o700)
with tarfile.open(backup/'homebridge-state.tar.gz','w:gz') as t:
 for name in ['config.json','persist','accessories','auth.json','.uix-secrets']:
  if (base/name).exists():t.add(base/name,arcname=name)
os.chmod(backup/'homebridge-state.tar.gz',0o600)
used={c['bridge']['username'].upper()}
used.update(x['_bridge']['username'].upper() for x in c['platforms'] if x.get('_bridge'))
for platform in c['platforms']:
 name=platform['platform']
 if name not in mappings:continue
 title,port=mappings[name]
 if not platform.get('_bridge'):
  while True:
   identity='0E:'+':'.join(f'{b:02X}' for b in secrets.token_bytes(5))
   if identity not in used:break
  used.add(identity)
  platform['_bridge']={'username':identity,'port':port,'name':title}
 print(name,platform['_bridge']['name'],platform['_bridge']['username'],platform['_bridge']['port'])
s=p.stat();temp=p.with_suffix('.child.tmp');temp.write_text(json.dumps(c,indent=2)+'\n');os.chown(temp,s.st_uid,s.st_gid);os.chmod(temp,stat.S_IMODE(s.st_mode));temp.replace(p)
print('Backup:',backup)
