'use strict';
// Q10 ss07 uses numeric DPS, not the B01 Q7 method/msgId envelope.
// Reference: Python-roborock protocols/b01_q10_protocol.py and traits/b01/q10/vacuum.py.
const fs = require('fs');
const waiters = new WeakMap();
function isQ10(a, id) {
  return a.getProductAttribute(id, 'model') === 'roborock.vacuum.ss07';
}
function normalized(raw) {
  const s = {};
  if (raw[121] !== undefined) {
    const state = Number(raw[121]);
    // HomeKit fan means cleaning, not returning/charging.
    s.state = state === 6 ? 3 : [102,103,104].includes(state) ? 5 : state;
    s.in_cleaning = [5,102,103,104].includes(state) ? 1 : 0;
    s.charge_status = state === 8 ? 1 : 0;
  }
  if (raw[122] !== undefined) s.battery = Number(raw[122]);
  return s;
}
function receive(a, id, payload) {
  if (!isQ10(a,id)) return false;
  const raw = {...payload.dps};
  if (raw[101] && typeof raw[101] === 'object') Object.assign(raw, raw[101]);
  const previous = a._q10Raw?.get(id) || {};
  const status = normalized(raw);
  // Keep the last cleaning state while relocating/transitioning, avoiding tile flicker.
  if ([101,105].includes(Number(raw[121])) && a.getLiveStatus(id,'in_cleaning')===1) {
    status.state=5;status.in_cleaning=1;
  }
  if (!a._q10Raw) a._q10Raw = new Map();
  a._q10Raw.set(id, {...(a._q10Raw.get(id)||{}), ...raw});
  a.recordLiveStatus(id, status);
  if (a.deviceNotify && Object.keys(status).length) a.deviceNotify('CloudMessage',status,id);
  if (raw[121] !== undefined || raw[122] !== undefined) {
    if ((raw[121] !== undefined && raw[121] !== previous[121]) || (raw[122] !== undefined && raw[122] !== previous[122]))
      a.log.info(`Q10 live status: state=${raw[121] ?? 'unchanged'}, battery=${raw[122] ?? 'unchanged'}`);
    // Only non-secret diagnostic fields; never persist raw device payloads.
    try { fs.writeFileSync('/var/lib/homebridge/q10-status.json', JSON.stringify({at:new Date().toISOString(),state:a._q10Raw.get(id)[121],battery:a._q10Raw.get(id)[122]}),{mode:0o600}); } catch (_) { /* Diagnostics cannot interrupt control. */ }
    const list = waiters.get(a)||[];
    for (const w of [...list]) if(w.id===id && w.matches(a._q10Raw.get(id))) w.resolve();
  }
  return true;
}
async function publish(a,id,dp,value) {
  if(!a.rr_mqtt_connector.isConnected()) throw new Error('Q10 cloud connection unavailable');
  const bytes = await a.message.buildRoborockMessage(id,101,Math.floor(Date.now()/1000),JSON.stringify({dps:{[dp]:value}}));
  if(!bytes) throw new Error('Cannot encode Q10 command');
  await a.rr_mqtt_connector.sendMessage(id,bytes);
}
async function status(a,id) { await publish(a,id,102,{}); }
async function command(a,id,method) {
  if (method==='app_start' && !a._q10Raw?.has(id)) {
    let entry,timer;
    const fresh = new Promise((resolve,reject)=>{
      entry={id,matches:r=>r[121]!==undefined,resolve};
      const list=waiters.get(a)||[];list.push(entry);waiters.set(a,list);
      timer=setTimeout(()=>reject(new Error('Q10 status is unknown; refusing to guess start/resume')),3000);
    });
    fresh.catch(()=>{});
    try {await status(a,id);await fresh;}
    finally {clearTimeout(timer);waiters.set(a,(waiters.get(a)||[]).filter(x=>x!==entry));}
  }
  const commands={app_start:[201,{cmd:1},r=>[5,102,103,104].includes(Number(r[121]))],app_stop:[206,0,r=>[2,3,8,10].includes(Number(r[121]))],app_pause:[204,0,r=>Number(r[121])===10],app_charge:[202,5,r=>[6,8,108].includes(Number(r[121]))]};
  const c=commands[method];
  // A paused Q10 task must be resumed; START_CLEAN does not resume it.
  if(method==='app_start' && Number(a._q10Raw?.get(id)?.[121])===10){c[0]=205;c[1]=0;}
  if(!c)throw new Error(`Q10 command ${method} is not supported`);
  let timer,w,poll;
  const result=new Promise((resolve,reject)=>{
    w={id,matches:c[2],resolve};
    const list=waiters.get(a)||[];list.push(w);waiters.set(a,list);
    timer=setTimeout(()=>reject(new Error('Q10 did not confirm '+method)),7000);
  });
  // Attach a handler immediately if the publish itself fails.
  result.catch(()=>{});
  try {
    await publish(a,id,c[0],c[1]);
    // Q10 actions have no RPC reply; confirm through fresh status requests.
    await status(a,id);
    poll=setInterval(()=>status(a,id).catch(()=>{}),1200);
    await result;a.log.info(`Q10 confirmed ${method}`);
  }
  finally {clearTimeout(timer);clearInterval(poll);waiters.set(a,(waiters.get(a)||[]).filter(x=>x!==w));}
}
function install(P) {
  const oldStart=P.startCommand,oldPoll=P.pollStatus,oldMin=P.updateDataMinimumData,oldExtra=P.updateDataExtraData,oldGet=P.getVacuumDeviceStatus;
  P.startCommand=async function(id,method,params){if(isQ10(this,id))return command(this,id,method);return oldStart.call(this,id,method,params);};
  P.pollStatus=async function(id){if(isQ10(this,id))return status(this,id);return oldPoll.call(this,id);};
  P.updateDataMinimumData=async function(id,...rest){if(isQ10(this,id)){try{return await status(this,id);}catch(e){this.log.warn('Q10 status request failed: '+e.message);return;}}return oldMin.call(this,id,...rest);};
  P.updateDataExtraData=async function(id,...rest){if(isQ10(this,id))return;return oldExtra.call(this,id,...rest);};
  P.getVacuumDeviceStatus=function(id,prop){if(isQ10(this,id)){
    const live=this.getLiveStatus(id,prop);if(live!==undefined)return live;
    const d=this.getVacuumDeviceData(id);const s=normalized(d?.deviceStatus||{});if(s[prop]!==undefined)return s[prop];
  }return oldGet.call(this,id,prop);};
}
module.exports={isQ10,receive,normalized,install,publish,status,command};
