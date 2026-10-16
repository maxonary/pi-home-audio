const {execFile}=require('node:child_process');
module.exports=api=>api.registerAccessory('SamsungM7Local',M7);
class M7 {
 constructor(log,config,api){
  this.log=log;this.name=config.name||'Samsung M7';this.cap=Math.min(30,Math.max(1,config.maxVolume||7));
  const S=api.hap.Service,C=api.hap.Characteristic;this.services=[];
  const info=new S.AccessoryInformation();info.setCharacteristic(C.Manufacturer,'Samsung').setCharacteristic(C.Model,'WAM750');this.services.push(info);
  const volume=new S.Lightbulb(this.name+' Volume','volume');
  volume.getCharacteristic(C.On).onGet(async()=>!(await this.state()).muted).onSet(v=>this.run('mute',v?'off':'on'));
  volume.getCharacteristic(C.Brightness).onGet(async()=>Math.min(100,Math.round((await this.state()).volume/this.cap*100))).onSet(v=>this.run('volume',String(Math.round(v/100*this.cap))));this.services.push(volume);
  for(const [label,id] of [['Network','wifi'],['Bluetooth','bt']]){
   const input=new S.Switch(this.name+' '+label,id);
   input.getCharacteristic(C.On).onGet(async()=>(await this.state()).input===id).onSet(async on=>{if(on)await this.run('input',id);});this.services.push(input);
  }
  this.timer=setInterval(()=>this.state(true).then(s=>{
   volume.updateCharacteristic(C.On,!s.muted).updateCharacteristic(C.Brightness,Math.min(100,Math.round(s.volume/this.cap*100)));
   this.services[2].updateCharacteristic(C.On,s.input==='wifi');this.services[3].updateCharacteristic(C.On,s.input==='bt');
  }).catch(e=>log.debug(e.message)),10000);this.timer.unref();
 }
 run(...args){return new Promise((resolve,reject)=>execFile('/usr/local/bin/m7ctl',args,{timeout:20000},(err,out)=>{if(err)return reject(err);try{this.cached=JSON.parse(out);this.at=Date.now();resolve(this.cached);}catch(e){reject(e);}}));}
 state(force=false){if(!force&&this.cached&&Date.now()-this.at<3000)return Promise.resolve(this.cached);if(!this.pending)this.pending=this.run('status').finally(()=>this.pending=null);return this.pending;}
 getServices(){return this.services;}
}
