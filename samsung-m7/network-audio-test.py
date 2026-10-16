import socket,threading,wave,time,json,urllib.request,urllib.parse,xml.etree.ElementTree as E
from http.server import BaseHTTPRequestHandler,HTTPServer
from io import BytesIO
speaker='169.254.90.130';pi='169.254.122.95';requests=[]
def call(name,params=''):
 u='http://'+speaker+':55001/UIC?'+'cmd='+urllib.parse.quote(('<pwron>on</pwron>' if name.startswith('Set') else '')+'<name>'+name+'</name>'+params,safe='')
 return E.fromstring(urllib.request.urlopen(u,timeout=5).read())
def value(name,tag):return call(name).findtext('.//'+tag)
original=value('GetFunc','function');volume=value('GetVolume','volume');mute=value('GetMute','mute')
b=BytesIO()
with wave.open(b,'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(44100);w.writeframes(bytes(44100*4*3))
data=b.getvalue()
class H(BaseHTTPRequestHandler):
 def do_GET(self):
  requests.append({'path':self.path,'peer':self.client_address[0]});self.send_response(200);self.send_header('Content-Type','audio/wav');self.send_header('Content-Length',str(len(data)));self.end_headers()
  try:self.wfile.write(data)
  except (BrokenPipeError,ConnectionResetError):pass
 def do_HEAD(self):self.send_response(200);self.send_header('Content-Type','audio/wav');self.send_header('Content-Length',str(len(data)));self.end_headers()
 def log_message(self,*a):pass
server=HTTPServer((pi,8095),H);threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 url='http://'+pi+':8095/m7-network-test.wav'
 params='<p type="cdata" name="url" val="empty"><![CDATA['+url+']]></p><p type="dec" name="buffersize" val="0"/><p type="dec" name="seektime" val="0"/><p type="dec" name="resume" val="1"/>'
 try:
  r=call('SetUrlPlayback',params);print('commandResult',r.find('.//response').attrib,flush=True)
 except (TimeoutError,socket.timeout):print('No HTTP acknowledgement for playback command',flush=True)
 time.sleep(5)
 print('fetchRequests',json.dumps(requests),flush=True)
 print('playStatus',E.tostring(call('GetPlayStatus'),encoding='unicode')[:700],flush=True)
finally:
 if original in ('bt','wifi','soundshare','aux'):
  try:call('SetFunc','<p type="str" name="function" val="'+original+'"/>')
  except (TimeoutError,socket.timeout):pass
 print('restoredInput',value('GetFunc','function'),'volume',value('GetVolume','volume'),'mute',value('GetMute','mute'),flush=True)
 server.shutdown()
