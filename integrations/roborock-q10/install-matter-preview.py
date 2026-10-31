#!/usr/bin/env python3
"""Install the additional Matter preview only onto the exact validated build."""
import hashlib,json,os,shutil,subprocess,tempfile
from pathlib import Path
src=Path(__file__).resolve().parent
root=Path('/var/lib/homebridge/node_modules/homebridge-roborock-vacuum')
manifest=json.loads((src/'matter-preview-manifest.json').read_text())
state=[]
for name,expected in manifest.items():
 digest=hashlib.sha256((root/name).read_bytes()).hexdigest()
 if digest not in expected.values():raise SystemExit('Unknown plugin build; refusing '+name)
 state.append('patched' if digest==expected['patched'] else 'original')
if len(set(state))!=1:raise SystemExit('Mixed file versions; restore the backup first')
if not (root/'roborockLib/lib/q10.js').exists():raise SystemExit('Install the base Q10 compatibility layer first')
backup=Path(tempfile.mkdtemp(prefix='roborock-before-matter-',dir='/var/backups'))
config=Path('/var/lib/homebridge/config.json');shutil.copy2(config,backup/'config.json');os.chmod(backup/'config.json',0o600)
if state[0]=='original':
 subprocess.run(['patch','--dry-run','-p1','-i',str(src/'matter-preview.patch')],cwd=root,check=True)
 for name in manifest:
  target=backup/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,target)
 subprocess.run(['patch','-p1','-i',str(src/'matter-preview.patch')],cwd=root,check=True)
c=json.loads(config.read_text())
for p in c['platforms']:
 if p.get('platform')=='RoborockVacuumPlatform':
  p['q10MatterPreview']=True;p['_bridge']['matter']={'enabled':True,'port':5530}
config.write_text(json.dumps(c,indent=2)+'\n')
print('Matter preview prepared; backup:',backup)
print('Restart Homebridge, pair the separate vacuum node and verify it before removing HAP controls.')
