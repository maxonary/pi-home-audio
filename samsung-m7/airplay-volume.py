#!/usr/bin/env python3
"""Fast Shairport hook: queue native speaker volume without blocking audio."""
import json,math,os,sys,time
from pathlib import Path
value=float(sys.argv[1])
if not math.isfinite(value) or (value!=-144 and not -30<=value<=0):raise SystemExit('Invalid AirPlay volume')
p=Path('/run/m7-network/volume-request.json');temp=p.with_name('volume-request.'+str(os.getpid())+'.tmp')
fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:json.dump({'db':value,'at':time.time()},f)
os.replace(temp,p)
