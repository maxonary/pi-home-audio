#!/usr/bin/env python3
"""Shairport S16/44.1kHz stereo FIFO to Samsung M7 HTTP WAV stream."""
import collections,json,os,select,socket,struct,threading,time,urllib.parse,urllib.request,xml.etree.ElementTree as E,subprocess
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
FIFO='/run/m7-network/audio';PORT=8095
cv=threading.Condition();history=collections.deque();sequence=0;generation=0;last=0;active=False;last_command=0
stats={'sessions':0,'fetches':0,'pcmBytes':0,'servedBytes':0,'command':'idle','clients':0}
def local_ip():
 result=json.loads(subprocess.check_output(['ip','-j','-4','addr','show','eth0'],text=True))
 for dev in result:
  for a in dev.get('addr_info',[]):
   if a['local'].startswith('169.254.'):return a['local']
 raise RuntimeError('Ethernet link-local address not available yet')
def discover(ip):
 s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);s.bind((ip,0));s.setsockopt(socket.IPPROTO_IP,socket.IP_MULTICAST_IF,socket.inet_aton(ip));s.settimeout(.2)
 s.sendto(b'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 1\r\nST: ssdp:all\r\n\r\n',('239.255.255.250',1900));end=time.monotonic()+3;locations=set()
 while time.monotonic()<end:
  try:
   raw,addr=s.recvfrom(8192)
   for line in raw.decode(errors='replace').splitlines():
    if line.lower().startswith('location:'):locations.add(line.split(':',1)[1].strip())
  except socket.timeout:pass
 s.close()
 for url in locations:
  try:
   root=E.fromstring(urllib.request.urlopen(url,timeout=2).read())
   if any(x.tag.endswith('modelName') and x.text=='SPK-WAM750' for x in root.iter()):return urllib.parse.urlparse(url).hostname
  except (OSError,E.ParseError):pass
 raise RuntimeError('No Samsung WAM750 found on direct Ethernet')
def command(name,params=''):
 xml='<pwron>on</pwron><name>'+name+'</name>'+params
 url='http://'+speaker+':55001/UIC?cmd='+urllib.parse.quote(xml,safe='')
 try:
  raw=urllib.request.urlopen(url,timeout=3).read();root=E.fromstring(raw)
  response=root.find('.//response');return response is not None and response.get('result')=='ok'
 except (OSError,E.ParseError):return False

def start_playback(g):
 global last_command
 last_command=time.monotonic()
 # The HTTP listener is started before PCM activates a speaker session.
 url='http://'+ip+':'+str(PORT)+'/live.wav?session='+str(g)
 args='<p type="cdata" name="url" val="empty"><![CDATA['+url+']]></p><p type="dec" name="buffersize" val="0"/><p type="dec" name="seektime" val="0"/><p type="dec" name="resume" val="1"/>'
 ok=command('SetUrlPlayback',args)
 with cv:stats['command']='accepted' if ok else 'no acknowledgement'
 print('M7 network playback command:',stats['command'],flush=True)

def reader():
 global sequence,generation,last,active
 fd=os.open(FIFO,os.O_RDWR|os.O_NONBLOCK)
 while True:
  ready=select.select([fd],[],[],.25)[0]
  data=os.read(fd,65536) if ready else b''
  with cv:
   if data:
    if not active:
     active=True;generation+=1;history.clear();stats['sessions']+=1
     threading.Thread(target=start_playback,args=(generation,),daemon=True).start()
    last=time.monotonic();sequence+=1;history.append((sequence,data));stats['pcmBytes']+=len(data)
    # Bound history to roughly two seconds at 176400 bytes/second.
    while sum(len(x[1]) for x in history)>352800:history.popleft()
    cv.notify_all()
   elif active and time.monotonic()-last>2:
    active=False;history.clear();cv.notify_all();print('AirPlay PCM idle; network stream closed',flush=True)
   if active and stats['clients']==0 and time.monotonic()-last_command>10:
    threading.Thread(target=start_playback,args=(generation,),daemon=True).start()

def wav_header(size):return b'RIFF'+struct.pack('<I',size+36)+b'WAVEfmt '+struct.pack('<IHHIIHH',16,1,2,44100,176400,4,16)+b'data'+struct.pack('<I',size)
class H(BaseHTTPRequestHandler):
 protocol_version='HTTP/1.0'
 def do_GET(self):
  if self.path=='/status':
   with cv:data=json.dumps({**stats,'active':active,'speaker':speaker,'ethernet':ip}).encode()
   self.send_response(200);self.send_header('Content-Length',str(len(data)));self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(data);return
  if not self.path.startswith('/live.wav') or self.client_address[0]!=speaker:self.send_error(404);return
  with cv:
   if not active:self.send_error(503);return
   g=generation;cursor=history[0][0]-1 if history else sequence;stats['fetches']+=1;stats['clients']+=1
  size=0x7fff0000
  self.send_response(200);self.send_header('Content-Type','audio/wav');self.send_header('Content-Length',str(size+44));self.send_header('Cache-Control','no-store');self.end_headers();self.connection.settimeout(4)
  try:
   self.wfile.write(wav_header(size))
   while True:
    with cv:
     if not active or generation!=g:break
     chunks=[(n,b) for n,b in history if n>cursor]
     if not chunks:cv.wait(.3);continue
    for n,b in chunks:
     self.wfile.write(b);cursor=n
     with cv:stats['servedBytes']+=len(b)
  except (OSError,TimeoutError):pass
  finally:
   with cv:stats['clients']-=1
 def log_message(self,*a):pass
if __name__=='__main__':
 ip=local_ip();speaker=discover(ip);print('Direct Ethernet:',ip,'→',speaker,flush=True)
 server=ThreadingHTTPServer((ip,PORT),H);threading.Thread(target=reader,daemon=True).start();server.serve_forever()
