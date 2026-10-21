'use strict';
const PLUGIN = 'homebridge-pi-home-audio';
const PLATFORM = 'PiHomeAudio';

module.exports = api => api.registerPlatform(PLUGIN, PLATFORM, PiHomeAudio);

class PiHomeAudio {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;
    this.cached = new Map();
    this.eqServices = new Map();
    api.on('didFinishLaunching', () => this.setup());
  }
  configureAccessory(accessory) { this.cached.set(accessory.UUID, accessory); }
  accessory(id, name, model) {
    const uuid = this.api.hap.uuid.generate(id);
    let a = this.cached.get(uuid);
    if (!a) {
      a = new this.api.platformAccessory(name, uuid);
      this.api.registerPlatformAccessories(PLUGIN, PLATFORM, [a]);
    }
    const { Service: S, Characteristic: C } = this.api.hap;
    a.getService(S.AccessoryInformation)
      .setCharacteristic(C.Manufacturer, 'Pi Home Audio')
      .setCharacteristic(C.Model, model)
      .setCharacteristic(C.SerialNumber, id);
    return a;
  }
  async x7(body, path = '/state') {
    const response = await fetch(this.config.x7Host + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + this.config.x7Token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error('X7 control unavailable: ' + response.status);
    return response.json();
  }
  setupReceiver() {
    const {Service:S,Characteristic:C}=this.api.hap;
    const a=new this.api.platformAccessory('Office X7',this.api.hap.uuid.generate('sound-blaster-x7-receiver'),this.api.hap.Categories.AUDIO_RECEIVER);
    a.getService(S.AccessoryInformation).setCharacteristic(C.Manufacturer,'Creative Technology').setCharacteristic(C.Model,'Sound Blaster X7').setCharacteristic(C.SerialNumber,'Office-X7');
    const tv=a.addService(S.Television,'Office X7','x7-receiver');
    tv.setCharacteristic(C.ConfiguredName,'Office X7').setCharacteristic(C.SleepDiscoveryMode,C.SleepDiscoveryMode.ALWAYS_DISCOVERABLE).setCharacteristic(C.ActiveIdentifier,1);
    // Active means audio enabled (unmuted); this does not claim hardware power control.
    tv.getCharacteristic(C.Active).onGet(async()=> (await this.x7()).muted ? C.Active.INACTIVE : C.Active.ACTIVE).onSet(async value=>{await this.x7({muted:value!==C.Active.ACTIVE});});
    tv.getCharacteristic(C.ActiveIdentifier).onGet(()=>1);
    tv.getCharacteristic(C.RemoteKey).onSet(()=>{});
    const input=a.addService(S.InputSource,'USB','x7-usb');
    input.setCharacteristic(C.Identifier,1).setCharacteristic(C.ConfiguredName,'USB').setCharacteristic(C.IsConfigured,C.IsConfigured.CONFIGURED).setCharacteristic(C.InputSourceType,C.InputSourceType.OTHER);
    tv.addLinkedService(input);
    const speaker=a.addService(S.TelevisionSpeaker,'X7 Speaker','x7-speaker');
    speaker.setCharacteristic(C.Active,C.Active.ACTIVE).setCharacteristic(C.VolumeControlType,C.VolumeControlType.RELATIVE_WITH_CURRENT);
    speaker.getCharacteristic(C.Mute).onGet(async()=> (await this.x7()).muted).onSet(async muted=>{await this.x7({muted:!!muted});});
    speaker.getCharacteristic(C.Volume).onGet(async()=> (await this.x7()).volume).onSet(async volume=>{await this.x7({volume:Math.max(0,Math.min(100,Math.round(volume)))});});
    let writes=Promise.resolve();
    speaker.getCharacteristic(C.VolumeSelector).onSet(value=>{
      const operation=writes.then(async()=>{
        const current=await this.x7();
        const volume=Math.max(0,Math.min(100,current.volume+(value===C.VolumeSelector.INCREMENT?5:-5)));
        const state=await this.x7({volume});
        speaker.updateCharacteristic(C.Volume,state.volume);
      });
      writes=operation.catch(()=>{});return operation;
    });
    tv.addLinkedService(speaker);
    this.api.publishExternalAccessories(PLUGIN,[a]);
    const poll=setInterval(async()=>{
      try {const s=await this.x7();speaker.updateCharacteristic(C.Volume,s.volume);speaker.updateCharacteristic(C.Mute,s.muted);tv.updateCharacteristic(C.Active,s.muted?C.Active.INACTIVE:C.Active.ACTIVE);}
      catch(e){this.log.debug('X7 receiver unavailable: '+e.message);}
    },15000);
    this.api.on('shutdown',()=>clearInterval(poll));
    this.log.info('Office X7 receiver registered: native volume +/- and mute; pair separately in Apple Home');
  }
  setup() {
    const { Service: S, Characteristic: C } = this.api.hap;
    if (!this.config.officeEQ) {
      for (const preset of ['flat', 'night', 'speech']) {
        const id = this.api.hap.uuid.generate('office-eq-' + preset);
        const accessory = this.cached.get(id);
        if (accessory) {
          this.api.unregisterPlatformAccessories(PLUGIN, PLATFORM, [accessory]);
          this.cached.delete(id);
        }
      }
    }
    // Remove the retired USB power accessory without changing pairing identity.
    const oldLight = this.cached.get(this.api.hap.uuid.generate('gallery-usb-light'));
    if (oldLight) {
      this.api.unregisterPlatformAccessories(PLUGIN, PLATFORM, [oldLight]);
      this.cached.delete(oldLight.UUID);
      this.log.info('Removed Gallery USB light switching');
    }
    if (!this.config.x7Host || !this.config.x7Token) {
      const old=this.cached.get(this.api.hap.uuid.generate('sound-blaster-x7-volume'));
      if(old) this.api.unregisterPlatformAccessories(PLUGIN,PLATFORM,[old]);
    }
    if (this.config.x7Host && this.config.x7Token) {
      const a=this.accessory('sound-blaster-x7-volume','Office Lautsprecher','Sound Blaster X7');
      a.displayName='Office Lautsprecher';
      a.getService(S.AccessoryInformation).setCharacteristic(C.Name,'Office Lautsprecher');
      const old=a.getService(S.Lightbulb);if(old)a.removeService(old);
      const fan=a.getService(S.Fan)||a.addService(S.Fan,'Office Lautsprecher','x7-volume-fan');
      fan.setCharacteristic(C.Name,'Office Lautsprecher');
      fan.getCharacteristic(C.On).onGet(async()=>!(await this.x7()).muted).onSet(async value=>{await this.x7({muted:!value});});
      fan.getCharacteristic(C.RotationSpeed).onGet(async()=>(await this.x7()).volume).onSet(async value=>{await this.x7({volume:Math.max(0,Math.min(100,Math.round(value)))});});
      this.api.updatePlatformAccessories([a]);
      if(this.config.nativeReceiver) this.setupReceiver();
      const poll=setInterval(async()=>{try{const s=await this.x7();fan.updateCharacteristic(C.On,!s.muted);fan.updateCharacteristic(C.RotationSpeed,s.volume);}catch(e){this.log.debug(e.message);}},15000);
      this.api.on('shutdown',()=>clearInterval(poll));
      this.log.info('X7 fan volume registered: speed = hardware volume, on/off = unmute/mute');
      if (this.config.officeEQ) {
        for (const preset of ['flat', 'night', 'speech']) {
          const name = 'Office EQ ' + preset[0].toUpperCase() + preset.slice(1);
          const a = this.accessory('office-eq-' + preset, name, 'Office software EQ');
          const s = a.getService(S.Switch) || a.addService(S.Switch, name);
          this.eqServices.set(preset, s);
          s.getCharacteristic(C.On)
            .onGet(async () => (await this.x7(undefined, '/eq')).preset === preset)
            .onSet(async value => {
              if (value) await this.x7({ preset }, '/eq');
              // Preset buttons always reflect the live selected preset.
              setTimeout(async () => {
                try {
                  const current = (await this.x7(undefined, '/eq')).preset;
                  for (const [key, service] of this.eqServices) service.updateCharacteristic(C.On, current === key);
                }
                catch (err) { this.log.error(err.message); }
              }, 100);
            });
        }
        this.log.info('Office EQ preset switches registered');
      }
    }
  }
}
