#!/usr/bin/env python3
"""Local Samsung M7 control over the Pi's direct Ethernet link."""
import argparse,json,socket,time,urllib.request,urllib.parse,xml.etree.ElementTree as E

def request(host,name,params='',write=False):
 command=('<pwron>on</pwron>' if write else '')+'<name>'+name+'</name>'+params
 url='http://'+host+':55001/UIC?'+'cmd='+urllib.parse.quote(command,safe='')
 try:return E.fromstring(urllib.request.urlopen(url,timeout=3).read())
 except (socket.timeout,TimeoutError):
  if write:return None # Some firmware does not acknowledge setters; verify by reading.
  raise

def get(host,name,field):
 for attempt in range(3):
  value=request(host,name).findtext('.//'+field)
  if value is not None:return value
  time.sleep(.2)
 raise RuntimeError('Speaker did not return '+field)

def status(host):return {'host':host,'name':get(host,'GetSpkName','spkname'),'volume':int(get(host,'GetVolume','volume')),'muted':get(host,'GetMute','mute')=='on','input':get(host,'GetFunc','function')}
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--host',default='169.254.90.130');sub=p.add_subparsers(dest='action',required=True);sub.add_parser('status');v=sub.add_parser('volume');v.add_argument('value',type=int,choices=range(31));m=sub.add_parser('mute');m.add_argument('value',choices=['on','off']);a=p.parse_args()
 if a.action=='volume':
  request(a.host,'SetVolume','<p type="dec" name="volume" val="'+str(a.value)+'"/>',True)
  if int(get(a.host,'GetVolume','volume'))!=a.value:raise RuntimeError('Volume change not confirmed')
 elif a.action=='mute':
  request(a.host,'SetMute','<p type="str" name="mute" val="'+a.value+'"/>',True)
  if get(a.host,'GetMute','mute')!=a.value:raise RuntimeError('Mute change not confirmed')
 print(json.dumps(status(a.host)))
