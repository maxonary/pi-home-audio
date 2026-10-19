const assert=require('node:assert/strict');
const q=require('./q10');
assert.deepEqual(q.normalized({121:6,122:72}),{state:3,in_cleaning:0,charge_status:0,battery:72});
assert.equal(q.normalized({121:104}).in_cleaning,1);
assert.equal(q.normalized({121:8}).charge_status,1);
let sent=[];
const a={getProductAttribute:()=> 'roborock.vacuum.ss07',rr_mqtt_connector:{isConnected:()=>true,sendMessage:async(id,b)=>sent.push(JSON.parse(b))},message:{buildRoborockMessage:async(id,p,t,b)=>b}};
(async()=>{
 await q.status(a,'robot'); assert.deepEqual(sent.pop(),{dps:{102:{}}});
 a.rr_mqtt_connector.isConnected=()=>false;
 await assert.rejects(q.status(a,'robot'),/unavailable/);
 a.rr_mqtt_connector.isConnected=()=>true;
 await assert.rejects(q.command(a,'robot','factory_reset'),/not supported/);
 assert.equal(q.isQ10({getProductAttribute:()=> 'roborock.vacuum.s7'},'robot'),false);
 console.log('Q10 encoding, status mapping, model isolation and error checks passed');
})();
const fs=require('node:fs'); const originalWrite=fs.writeFileSync;fs.writeFileSync=()=>{};
(async()=>{
 let rawState=8;
 const api={...a,log:{info:()=>{}},recordLiveStatus:()=>{},getLiveStatus:()=>0,getProductAttribute:()=> 'roborock.vacuum.ss07'};
 api.rr_mqtt_connector={isConnected:()=>true,sendMessage:async(id,b)=>{
   const d=JSON.parse(b).dps;
   if(d[201]!==undefined){assert.deepEqual(d[201],{cmd:1});rawState=5;}
   if(d[205]!==undefined){assert.equal(d[205],0);rawState=5;}
   if(d[206]!==undefined){assert.equal(d[206],0);rawState=3;}
   if(d[202]!==undefined){assert.equal(d[202],5);rawState=6;}
   setImmediate(()=>q.receive(api,id,{dps:{121:rawState,122:80}}));
 }};
 api._q10Raw=new Map([['robot',{121:10}]]);
 for(const method of ['app_start','app_stop','app_charge'])await q.command(api,'robot',method);
 await new Promise(resolve=>setImmediate(resolve));
 fs.writeFileSync=originalWrite;
 console.log('Q10 start, stop and dock confirmed from mocked device status');
})().catch(e=>{fs.writeFileSync=originalWrite;console.error(e);process.exitCode=1;});
