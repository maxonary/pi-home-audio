const assert=require('node:assert/strict');
const {RoborockVacuumMatterAccessory:Vacuum}=require(process.env.ROBOROCK_PLUGIN_DIR + '/dist/vacuum_matter_accessory');
const v=Object.create(Vacuum.prototype);const updates=[];const calls=[];
Object.assign(v,{duid:'test',rooms:[],selectedSegments:[],supportedCleanModes:[{mode:0}],currentCleanMode:0,capabilities:{mopSupported:true,fanOff:105,waterOff:200},currentRunMode:0,currentOperationalState:0,updateState:async(c,s)=>updates.push([c,s]),logInfo:()=>{},logError:(...a)=>{throw new Error(a.join(' '));},roborockAPI:{getProductAttribute:()=> 'roborock.vacuum.ss07',_q10Raw:new Map([['test',{121:6}]]),app_start:async()=>calls.push('start'),app_stop:async()=>calls.push('stop'),app_charge:async()=>calls.push('dock'),app_pause:async()=>calls.push('pause')}});
(async()=>{
 v.updateFromRoborockData({state:3,battery:99},true);
 assert.equal(v.lastState,6,'Matter must not inherit HAP returning-as-off normalization');
 assert(updates.some(([c,s])=>c==='rvcOperationalState'&&s.operationalState===64));
 v.roborockAPI._q10Raw.set('test',{121:104});v.updateFromRoborockData({},true);assert.equal(v.lastState,6302);assert.equal(v.currentRunMode,1);
 await v.handleChangeRunMode({newMode:1});await v.handleChangeRunMode({newMode:0});await v.handleGoHome();
 assert.deepEqual(calls,['start','stop','dock']);
 await v.handleChangeCleanMode({newMode:0});assert.equal(calls.length,3,'Current settings mode must not write preferences');
 console.log('Native Q10 dock/clean state mapping and command delegation passed');process.exit(0);
})().catch(e=>{console.error(e);process.exitCode=1;});
