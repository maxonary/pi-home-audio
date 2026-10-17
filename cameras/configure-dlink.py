#!/usr/bin/env python3
"""Run interactively on the Pi: privately prompt for local camera credentials."""
import getpass,json,os,pathlib,shutil,subprocess,time,urllib.request,urllib.parse,urllib.error
CONFIG=pathlib.Path('/var/lib/homebridge/config.json')
def main():
 if os.geteuid()!=0:raise SystemExit('Run with sudo.')
 cameras=[]
 for model,host in [('DCS-932L','192.168.178.38'),('DCS-5010L','192.168.178.43')]:
  print('\n'+model+' ('+host+') — use the camera local login, not mydlink.')
  username=input('Camera username [admin]: ').strip() or 'admin'
  password=getpass.getpass('Camera password (hidden): ')
  base='http://'+host
  manager=urllib.request.HTTPPasswordMgrWithDefaultRealm();manager.add_password(None,base,username,password)
  opener=urllib.request.build_opener(urllib.request.HTTPBasicAuthHandler(manager),urllib.request.HTTPDigestAuthHandler(manager))
  try:
   with opener.open(base+'/video.cgi',timeout=8) as r:
    kind=r.headers.get('Content-Type','').lower();r.read(64)
    if 'multipart' not in kind and 'mjpeg' not in kind:raise ValueError('Unexpected video format: '+kind)
  except (urllib.error.URLError,ValueError,TimeoutError):
   raise SystemExit('Could not verify the video login for '+model+'. No configuration was changed. Check its local login and retry.')
  # Credentials are URL-encoded; never print URLs or passwords.
  auth=urllib.parse.quote(username,safe='')+':'+urllib.parse.quote(password,safe='')+'@'
  url='http://'+auth+host
  cameras.append({'name':'D-Link '+model,'manufacturer':'D-Link','model':model,'videoConfig':{'source':'-i '+url+'/video.cgi','stillImageSource':'-i '+url+'/image/jpeg.cgi','maxStreams':1,'maxWidth':640,'maxHeight':480,'maxFPS':10,'maxBitrate':250,'vcodec':'libx264','encoderOptions':'-preset ultrafast -tune zerolatency','audio':False}})
  print('Local video login verified.')
 x=json.loads(CONFIG.read_text());backup=pathlib.Path('/var/backups/m7-homekit/config-before-dlink-'+str(int(time.time()))+'.json');shutil.copy2(CONFIG,backup);os.chmod(backup,0o600)
 x['platforms']=[p for p in x.get('platforms',[]) if p.get('platform')!='Camera-ffmpeg']
 x['platforms'].append({'platform':'Camera-ffmpeg','name':'D-Link Cameras','cameras':cameras})
 temp=CONFIG.with_suffix('.json.tmp');temp.write_text(json.dumps(x,indent=2)+'\n');os.chmod(temp,0o600);shutil.chown(temp,user='homebridge',group='homebridge');os.replace(temp,CONFIG)
 subprocess.run(['systemctl','restart','homebridge'],check=True)
 print('Both cameras configured. Homebridge is restarting. Test one live view at a time.')
if __name__=='__main__':main()
