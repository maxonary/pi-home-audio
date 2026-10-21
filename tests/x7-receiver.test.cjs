const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');
const hap=require(process.env.HAP_NODEJS_PATH||'hap-nodejs');
const events=new EventEmitter();let Platform,receiver;const retired=[];
const api={hap,platformAccessory:hap.Accessory,on:events.on.bind(events),registerPlatform:(_p,_n,C)=>Platform=C,unregisterPlatformAccessories:(_p,_n,a)=>retired.push(...a),registerPlatformAccessories:()=>{},updatePlatformAccessories:()=>{},publishExternalAccessories:(_p,a)=>receiver=a[0]};
require('../homebridge-plugin')(api);
const p=new Platform({info:()=>{},debug:()=>{},error:()=>{}},{x7Host:'http://localhost',x7Token:'test'},api);
const old=new hap.Accessory('X7 Volume',hap.uuid.generate('sound-blaster-x7-volume'));p.configureAccessory(old);
let state={volume:69,muted:true};p.x7=async body=>{if(body)state={...state,...body};return state;};p.setup();
const set=(service,C,v)=>new Promise((resolve,reject)=>service.getCharacteristic(C).setValue(v,e=>e?reject(e):resolve()));
(async()=>{
 assert(!old.getService(hap.Service.Lightbulb));
 const fan=old.getService(hap.Service.Fan);assert(fan);
 assert.equal(fan.getCharacteristic(hap.Characteristic.Name).value,'Office Lautsprecher');
 await set(fan,hap.Characteristic.RotationSpeed,35);assert.equal(state.volume,35);
 await set(fan,hap.Characteristic.On,false);assert.equal(state.muted,true);
 await set(fan,hap.Characteristic.On,true);assert.equal(state.muted,false);
 events.emit('shutdown');console.log('X7 fan speed and mute passed; no light service remains');
})().catch(e=>{events.emit('shutdown');console.error(e);process.exitCode=1;});
