#!/usr/bin/env python3
import base64,json,os,threading,time,xml.etree.ElementTree as ET
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
ROOT=Path(__file__).parent
state={'title':'Bedroom','artist':'Ready for AirPlay','album':'','playing':False,'elapsed':0,'duration':0,'updated':time.monotonic(),'art':0}
lock=threading.Lock()
art=b''
def consume(item):
 global art
 code=bytes.fromhex(item.findtext('code')).decode('ascii','replace')
 data=base64.b64decode(item.findtext('data') or '')
 with lock:
  keys={'minm':'title','asar':'artist','asal':'album'}
  if code in keys: state[keys[code]]=data.decode('utf-8','replace')
  elif code=='PICT' and data.startswith((b'\xff\xd8',b'\x89PNG')): art=data;state['art']+=1
  elif code in ('pbeg','prsm'): state['playing']=True;state['updated']=time.monotonic()
  elif code in ('pend','pfls'):
   state['elapsed']=min(state['duration'],state['elapsed']+(time.monotonic()-state['updated'] if state['playing'] else 0));state['playing']=False;state['updated']=time.monotonic()
  elif code=='prgr':
   try:
    start,current,end=map(int,data.decode().split(','));state.update(elapsed=((current-start)%2**32)/44100,duration=((end-start)%2**32)/44100,updated=time.monotonic())
   except (ValueError,UnicodeError): pass

def reader():
 while True:
  try:
   with open('/run/bedroom-now-playing/metadata','rb',buffering=0) as pipe:
    buf=b''
    while True:
     part=pipe.read(65536)
     if not part: break
     buf+=part
     while b'</item>' in buf:
      raw,buf=buf.split(b'</item>',1)
      try: consume(ET.fromstring(raw+b'</item>'))
      except (ET.ParseError,ValueError): pass
     if len(buf)>16*1024*1024: buf=b''
  except OSError: pass
  time.sleep(1)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_GET(self):
  if self.path.split('?')[0] in ('/state','/art'):
   with lock:
    snapshot=dict(state)
    if snapshot['playing']: snapshot['elapsed']=min(snapshot['duration'],snapshot['elapsed']+time.monotonic()-snapshot['updated'])
    data=json.dumps(snapshot).encode() if self.path.startswith('/state') else art
   self.send_response(200);self.send_header('Content-Type','application/json' if self.path.startswith('/state') else ('image/png' if data.startswith(b'\x89PNG') else 'image/jpeg'));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
  else: super().do_GET()
 def log_message(self,*args): pass
if __name__=='__main__':
 threading.Thread(target=reader,daemon=True).start()
 ThreadingHTTPServer(('127.0.0.1',8090),Handler).serve_forever()
