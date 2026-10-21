const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');
const hap=require(process.env.HAP_NODEJS_PATH||'hap-nodejs');
const events=new EventEmitter();let Platform,receiver;const retired=[];
const api={hap,platformAccessory:hap.Accessory,on:events.on.bind(events),registerPlatform:(_p,_n,C)=>Platform=C,unregisterPlatformAccessories:(_p,_n,a)=>retired.push(...a),publishExternalAccessories:(_p,a)=>receiver=a[0]};
require('../homebridge-plugin')(api);
const p=new Platform({info:()=>{},debug:()=>{},error:()=>{}},{x7Host:'http://localhost',x7Token:'test'},api);
const old=new hap.Accessory('X7 Volume',hap.uuid.generate('sound-blaster-x7-volume'));p.configureAccessory(old);
let state={volume:69,muted:true};p.x7=async body=>{if(body)state={...state,...body};return state;};p.setup();
const set=(service,C,v)=>new Promise((resolve,reject)=>service.getCharacteristic(C).setValue(v,e=>e?reject(e):resolve()));
(async()=>{
 assert(retired.includes(old));assert(receiver);assert(!receiver.getService(hap.Service.Lightbulb));
 const speaker=receiver.getService(hap.Service.TelevisionSpeaker),tv=receiver.getService(hap.Service.Television);
 assert(tv.linkedServices.includes(speaker));assert.equal(speaker.getCharacteristic(hap.Characteristic.VolumeControlType).value,hap.Characteristic.VolumeControlType.RELATIVE_WITH_CURRENT);
 await set(speaker,hap.Characteristic.VolumeSelector,hap.Characteristic.VolumeSelector.INCREMENT);assert.equal(state.volume,74);
 await set(speaker,hap.Characteristic.VolumeSelector,hap.Characteristic.VolumeSelector.DECREMENT);assert.equal(state.volume,69);
 await set(speaker,hap.Characteristic.Mute,false);assert.equal(state.muted,false);
 events.emit('shutdown');console.log('X7 receiver +/- and mute passed; legacy volume light retired');
})().catch(e=>{events.emit('shutdown');console.error(e);process.exitCode=1;});
