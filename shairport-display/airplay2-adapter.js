const {spawnSync}=require('node:child_process');
module.exports=(reader,health)=>{
 const original=reader.useData.bind(reader);let meta={};
 reader.useData=data=>{
  health.codes ||= {}; health.codes[data.code]=(health.codes[data.code]||0)+1;
  if(data.code!=='copl')return original(data);
  const result=spawnSync('/usr/bin/python3',['-c',`import plistlib,json,sys,base64
p=plistlib.loads(sys.stdin.buffer.read())
def clean(x):
 if isinstance(x,bytes): return {'base64':base64.b64encode(x).decode()}
 if isinstance(x,dict): return {k:clean(v) for k,v in x.items()}
 if isinstance(x,list): return [clean(v) for v in x]
 if isinstance(x,(str,int,float,bool)) or x is None:return x
 return str(x)
print(json.dumps(clean(p)))`],{input:data.cont,timeout:2000,maxBuffer:8*1024*1024});
  try{
   const p=JSON.parse(result.stdout);health.commandType=p.type;
   if(p.type!=='updateMRNowPlayingInfo')return;
   const outer=p.params||{},info=outer.params||{}; health.infoKeys=Object.keys(info);
   const prefix='kMRMediaRemoteNowPlayingInfo';
   if(outer.mergePolicy==='replace')meta={};
   for(const [key,out] of [['Title','minm'],['Artist','asar'],['Album','asal'],['UniqueIdentifier','mper']])if(info[prefix+key]!==undefined)meta[out]=info[prefix+key];
   if(info[prefix+'Duration']!==undefined)meta.astm=Number(info[prefix+'Duration'])*1000;
   if(meta.minm)reader.emit('meta',{...meta});
   const art=info[prefix+'ArtworkData'];if(art?.base64)reader.emit('PICT',art.base64);
   if(info[prefix+'ElapsedTime']!==undefined)reader.emit('prgr',{start:0,current:Number(info[prefix+'ElapsedTime'])*44100,end:(meta.astm||0)*44.1});
   if(info[prefix+'PlaybackRate']===0)reader.emit('pfls',{});
  }catch(e){health.adapterError='Invalid AirPlay 2 plist';}
 };
};
