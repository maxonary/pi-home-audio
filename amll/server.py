#!/usr/bin/env python3
"""Local-only Shairport metadata gateway for Bedroom's AMLL display."""
import base64,json,os,plistlib,re,threading,time,xml.etree.ElementTree as ET
from collections import Counter
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
ROOT=Path(os.environ.get('AMLL_ROOT','/home/pi/shairport-metadata-display/public/amll'))
FIFO='/run/bedroom-now-playing/metadata'
state={'title':'','artist':'','album':'','playing':False,'elapsed':0,'duration':0,'art':0,'timing':False,'session':False}
lock=threading.RLock();art=b'';at=time.monotonic();counts=Counter();last_received=None

def elapsed():
 return min(state['duration'],state['elapsed']+(time.monotonic()-at if state['playing'] else 0)) if state['duration'] else state['elapsed']
def set_playing(value):
 global at
 state['elapsed']=elapsed();state['playing']=value;at=time.monotonic()
def picture(data):
 global art
 if data.startswith((b'\xff\xd8',b'\x89PNG',b'RIFF')) and len(data)<=8*1024*1024:
  art=data;state['art']+=1

def command(data):
 global at,art
 p=plistlib.loads(data)
 if p.get('type')!='updateMRNowPlayingInfo':return
 outer=p.get('params',{});info=outer.get('params',{})
 prefix='kMRMediaRemoteNowPlayingInfo'
 if outer.get('mergePolicy')=='replace':
  if info.get(prefix+'Title') != state['title']:
   art=b'';state['art']=0
  state.update(title='',artist='',album='',duration=0,elapsed=0,timing=False)
 for key,target in [('Title','title'),('Artist','artist'),('Album','album')]:
  if prefix+key in info:state[target]=str(info[prefix+key])
 if prefix+'Duration' in info:state['duration']=max(0,float(info[prefix+'Duration']))
 if prefix+'ElapsedTime' in info:
  state['elapsed']=max(0,float(info[prefix+'ElapsedTime']));state['timing']=True;at=time.monotonic()
 if prefix+'PlaybackRate' in info:set_playing(float(info[prefix+'PlaybackRate'])>0)
 if isinstance(info.get(prefix+'ArtworkData'),bytes):picture(info[prefix+'ArtworkData'])
 state['session']=True

def consume(code,data):
 global at,last_received,art
 with lock:
  counts[code]+=1;last_received=time.time()
  if code=='copl':command(data)
  elif code in ('minm','asar','asal'):
   state[{'minm':'title','asar':'artist','asal':'album'}[code]]=data.decode('utf-8','replace');state['session']=True
  elif code=='PICT':picture(data)
  elif code in ('pbeg','prsm','phb0','phbt'):state['session']=True;set_playing(True)
  elif code=='pfls':set_playing(False)
  elif code in ('pend','disc'):set_playing(False);state['session']=False
  elif code=='prgr':
   start,current,end=map(int,re.split('[,/]',data.decode()))
   # RTP clock uses the AirPlay stream's sampling rate (48 kHz on this receiver).
   rate=48000
   state.update(elapsed=((current-start)%2**32)/rate,duration=((end-start)%2**32)/rate,timing=True,session=True)
   at=time.monotonic()
  elif code=='astm' and data:state['duration']=int.from_bytes(data,'big')/1000

def reader():
 while True:
  try:
   with open(FIFO,'rb',buffering=0) as pipe:
    buf=b''
    while True:
     part=pipe.read(65536)
     if not part:break
     buf+=part
     while b'</item>' in buf:
      raw,buf=buf.split(b'</item>',1)
      try:
       item=ET.fromstring(raw[raw.index(b'<item>'):]+b'</item>')
       code=bytes.fromhex(item.findtext('code')).decode('ascii')
       consume(code,base64.b64decode(item.findtext('data') or ''))
      except (ET.ParseError,ValueError,TypeError,KeyError,plistlib.InvalidFileException):counts['parse_errors']+=1
     if len(buf)>16*1024*1024:buf=b''
  except OSError:pass
  time.sleep(.5)

class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  path=self.path.split('?')[0]
  if path in ('/state','/art','/diagnostics'):
   with lock:
    snapshot={**state,'elapsed':elapsed()}
    payload=snapshot if path=='/state' else {'codes':dict(counts),'lastReceived':last_received}
    data=art if path=='/art' else json.dumps(payload).encode()
   self.send_response(200);self.send_header('Content-Type',('image/png' if data.startswith(b'\x89PNG') else 'image/jpeg') if path=='/art' else 'application/json');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
  else:
   if path in ('/','/amll/'):self.path='/index.html'
   super().do_GET()
 def log_message(self,*args):pass
if __name__=='__main__':
 threading.Thread(target=reader,daemon=True).start();ThreadingHTTPServer(('127.0.0.1',3600),Handler).serve_forever()
