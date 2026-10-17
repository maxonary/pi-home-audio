const {execFile}=require('node:child_process');
const PLUGIN='homebridge-samsung-m7-local';
module.exports=api=>api.registerPlatform(PLUGIN,'SamsungM7Local',class {
 constructor(log,config,api){
  api.on('didFinishLaunching',()=>{
   const accessory=new api.platformAccessory(config.name||'Samsung M7',api.hap.uuid.generate('samsung-m7-local-receiver-v1'),api.hap.Categories.AUDIO_RECEIVER);
   const volume=this.cachedVolume||new api.platformAccessory('M7 Volume',api.hap.uuid.generate('samsung-m7-local-volume-v1'),api.hap.Categories.LIGHTBULB);
   this.controller=new M7(log,config,api,accessory,volume);
   if(!this.cachedVolume)api.registerPlatformAccessories(PLUGIN,'SamsungM7Local',[volume]);
   api.publishExternalAccessories(PLUGIN,[accessory]);
  });
  api.on('shutdown',()=>{if(this.controller)clearInterval(this.controller.timer);});
 }
 configureAccessory(accessory){this.cachedVolume=accessory;}
});
class M7 {
 constructor(log,config,api,accessory,volumeAccessory){
  this.log=log;this.name=config.name||'Samsung M7';this.cap=Math.min(30,Math.max(1,config.maxVolume||7));
  const S=api.hap.Service,C=api.hap.Characteristic;this.C=C;
  accessory.getService(S.AccessoryInformation).setCharacteristic(C.Manufacturer,'Samsung').setCharacteristic(C.Model,'WAM750').setCharacteristic(C.SerialNumber,'M7-Ethernet');
  this.tv=accessory.addService(S.Television,this.name,'receiver');this.tv.setPrimaryService();
  this.tv.setCharacteristic(C.ConfiguredName,this.name).setCharacteristic(C.SleepDiscoveryMode,C.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);
  // The supported native control is mute, not an unverified standby command.
  this.tv.getCharacteristic(C.Active).onGet(async()=>!(await this.state()).muted?C.Active.ACTIVE:C.Active.INACTIVE).onSet(async v=>{await this.run('mute',v===C.Active.ACTIVE?'off':'on');});
  this.tv.getCharacteristic(C.ActiveIdentifier).onGet(async()=>this.inputID((await this.state()).input)).onSet(v=>{
   const input={1:'wifi',2:'bt'}[v];if(!input)throw new Error('Unsupported input');return this.run('input',input).then(()=>{});
  });
  this.tv.getCharacteristic(C.RemoteKey).onSet(async v=>{
   if(v===C.RemoteKey.ARROW_UP)await this.adjust(1);
   else if(v===C.RemoteKey.ARROW_DOWN)await this.adjust(-1);
   else if(v===C.RemoteKey.PLAY_PAUSE)await this.run('mute',(await this.state()).muted?'off':'on');
  });
  this.speaker=accessory.addService(S.TelevisionSpeaker,this.name+' Speaker','speaker');
  this.speaker.setCharacteristic(C.Active,C.Active.ACTIVE).setCharacteristic(C.VolumeControlType,C.VolumeControlType.ABSOLUTE);
  this.speaker.getCharacteristic(C.Mute).onGet(async()=>(await this.state()).muted).onSet(async v=>{await this.run('mute',v?'on':'off');});
  this.speaker.getCharacteristic(C.Volume).onGet(async()=>this.percent((await this.state()).volume)).onSet(async v=>{await this.run('volume',String(Math.round(v/100*this.cap)));});
  this.speaker.getCharacteristic(C.VolumeSelector).onSet(v=>this.adjust(v===C.VolumeSelector.INCREMENT?1:-1));this.tv.addLinkedService(this.speaker);
  for(const [id,label] of [[1,'Network / AirPlay'],[2,'Bluetooth']]){
   const input=accessory.addService(S.InputSource,label,'input-'+id);
   input.setCharacteristic(C.Identifier,id).setCharacteristic(C.ConfiguredName,label).setCharacteristic(C.IsConfigured,C.IsConfigured.CONFIGURED).setCharacteristic(C.InputSourceType,C.InputSourceType.OTHER).setCharacteristic(C.CurrentVisibilityState,C.CurrentVisibilityState.SHOWN);
   this.tv.addLinkedService(input);
  }
  volumeAccessory.getService(S.AccessoryInformation).setCharacteristic(C.Manufacturer,'Samsung').setCharacteristic(C.Model,'WAM750 Volume');
  this.volumeLight=volumeAccessory.getService(S.Lightbulb)||volumeAccessory.addService(S.Lightbulb,'M7 Volume','volume');
  if(!this.volumeLight.testCharacteristic(C.ConfiguredName))this.volumeLight.addOptionalCharacteristic(C.ConfiguredName);
  this.volumeLight.setCharacteristic(C.Name,'M7 Volume').setCharacteristic(C.ConfiguredName,'M7 Volume');
  this.volumeLight.getCharacteristic(C.On).onGet(async()=>!(await this.state()).muted).onSet(async v=>{await this.run('mute',v?'off':'on');});
  this.volumeLight.getCharacteristic(C.Brightness).onGet(async()=>this.percent((await this.state()).volume)).onSet(async v=>{await this.run('volume',String(Math.round(v/100*this.cap)));});
  this.timer=setInterval(()=>this.state(true).then(s=>this.update(s)).catch(e=>log.debug(e.message)),10000);this.timer.unref();
 }
 inputID(input){return {wifi:1,bt:2}[input]||0;}
 percent(volume){return Math.min(100,Math.round(volume/this.cap*100));}
 update(s){const C=this.C;this.tv.updateCharacteristic(C.Active,s.muted?C.Active.INACTIVE:C.Active.ACTIVE).updateCharacteristic(C.ActiveIdentifier,this.inputID(s.input));this.speaker.updateCharacteristic(C.Mute,s.muted).updateCharacteristic(C.Volume,this.percent(s.volume));this.volumeLight.updateCharacteristic(C.On,!s.muted).updateCharacteristic(C.Brightness,this.percent(s.volume));}
 async adjust(delta){const s=await this.state(true);await this.run('volume',String(Math.min(this.cap,Math.max(0,s.volume+delta))));}
 run(...args){
  const call=()=>new Promise((resolve,reject)=>execFile('/usr/local/bin/m7ctl',args,{timeout:20000},(err,out)=>{if(err)return reject(err);try{this.cached=JSON.parse(out);this.at=Date.now();this.update(this.cached);resolve(this.cached);}catch(e){reject(e);}}));
  const result=(this.queue||Promise.resolve()).then(call);this.queue=result.catch(()=>{});return result;
 }
 state(force=false){if(!force&&this.cached&&Date.now()-this.at<3000)return Promise.resolve(this.cached);if(!this.pending)this.pending=this.run('status').finally(()=>this.pending=null);return this.pending;}
}
