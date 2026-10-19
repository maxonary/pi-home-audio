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
    if (this.config.x7Host && this.config.x7Token) {
      const a = this.accessory('sound-blaster-x7-volume', 'X7 Volume', 'Sound Blaster X7');
      const s = a.getService(S.Lightbulb) || a.addService(S.Lightbulb, 'X7 Volume');
      s.getCharacteristic(C.On)
        .onGet(async () => !(await this.x7()).muted)
        .onSet(async value => { await this.x7({ muted: !value }); });
      s.getCharacteristic(C.Brightness)
        .onGet(async () => (await this.x7()).volume)
        .onSet(async value => { await this.x7({ volume: Math.round(value) }); });
      this.log.info('X7 Volume registered (brightness = volume, on/off = unmute/mute)');
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
