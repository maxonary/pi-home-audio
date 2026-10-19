#!/usr/bin/env python3
"""Apply the tested Q10 compatibility patch to an exact supported plugin build."""
import hashlib,json,shutil,subprocess,sys,tempfile
from pathlib import Path
source=Path(__file__).resolve().parent
root=Path(sys.argv[1] if len(sys.argv)>1 else '/var/lib/homebridge/node_modules/homebridge-roborock-vacuum')
manifest=json.loads((source/'manifest.json').read_text())
states=[]
for name,hashes in manifest.items():
 digest=hashlib.sha256((root/name).read_bytes()).hexdigest()
 if digest not in hashes.values():raise SystemExit('Unknown plugin build; refusing to overwrite '+name)
 states.append('patched' if digest==hashes['patched'] else 'original')
if len(set(states))!=1:raise SystemExit('Mixed file versions; restore backup before applying')
if states[0]=='original':
 subprocess.run(['patch','--dry-run','-p1','-i',str(source/'compat.patch')],cwd=root,check=True)
 backup=Path(tempfile.mkdtemp(prefix='roborock-q10-',dir='/var/backups'))
 for name in manifest:
  target=backup/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,target)
 subprocess.run(['patch','-p1','-i',str(source/'compat.patch')],cwd=root,check=True)
 print('Original files saved in',backup)
shutil.copy2(source/'q10.js',root/'roborockLib/lib/q10.js')
print('Q10 compatibility installed. Restart only the Roborock child bridge.')
