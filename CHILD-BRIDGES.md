# Child bridge isolation

Enabled on Gallery and Bedroom on 2026-10-15. No new Homebridge server was
installed on Office. AirPlay services were not restarted.

| Host | Plugin | Child bridge | Port |
| --- | --- | --- | --- |
| Gallery | SwitchBot | Gallery SwitchBot | 52101 |
| Gallery | PiHomeAudio | Gallery Audio Controls | 52102 |
| Gallery | RoborockVacuumPlatform | Gallery Roborock | 52103 |
| Bedroom | SoundBlasterKatana | Bedroom Katana | 52201 |
| Bedroom | SwitchBot | Bedroom SwitchBot | 52202 |

Every plugin has a unique bridge identity and independent Node process. All
five child bridges loaded and listened on their configured ports. Gallery
Homebridge-user API checks still read/wrote X7 volume and read lamp status.
The Roborock child bridge starts but needs account login to discover the S7.
RAM available after startup was approximately 312 MB Gallery / 334 MB Bedroom.

Pair each child bridge separately in Apple Home using its Homebridge UI QR
code, or Add Accessory -> More Options and the relevant original main bridge
pairing code (child pins inherit it). Gallery still needs its first web UI
account created. Pairing is a user step and has not been verified here.
Moved accessories may need room, scene and automation assignments recreated.
No Apple Home accessories or bridges were manually removed by the agent.

Katana's plugin publishes a separate external speaker accessory. It advertises
as `Katana 6E96` after the change and needs its own Apple Home pairing; pairing
the empty Bedroom Katana bridge alone does not add that speaker. Use the
setup code shown in Bedroom's Homebridge log/UI for that external accessory.
Bedroom SwitchBot still reports missing explicit bot mode/device type from its
existing configuration; this migration did not change its device settings.

Backups (root-only archives containing credentials and pairing keys):
- Gallery `/var/backups/pi-home-audio/pre-child-bridges-20261015-154133/homebridge-state.tar.gz`
- Bedroom `/var/backups/pi-home-audio/pre-child-bridges-20261015-154144/homebridge-state.tar.gz`

Archives include config.json, persist/, accessories/, and UI auth/secrets when
present. Never commit them. They support rollback of server-side state; they
cannot restore Apple Home room/automation changes made later on the phone.

To roll back, stop Homebridge, restore the appropriate archive into
`/var/lib/homebridge` preserving ownership, and start Homebridge. Do not run
the old main and restored duplicate identities simultaneously on other hosts.
After pairing new child bridges, rolling back also requires reconciling those
pairings in Apple Home.

`scripts/configure-child-bridges.py gallery|bedroom` is the deployed migration:
run as root on the appropriate host. It backs up state, adds missing bridge
identities, and preserves existing credentials and plugin options. Restart
Homebridge afterward. Do not run it on an unrelated server.

Child bridges isolate plugin crashes/restarts, not whole-host power/network
failures. There is no cross-Pi automatic takeover.

Reference: https://github.com/homebridge/homebridge/wiki/Child-Bridges

## Office-local Homebridge — 2026-10-19

Office now has Homebridge installed as an enabled system service. UI:
`http://192.168.2.132:8581`. `Office X7 Controls` is a separate child bridge on
52301. The local plugin is installed from `/opt/pi-home-audio/homebridge-plugin`
and calls `http://127.0.0.1:8100`, using the existing X7 API token locally.
The token and pairing files remain on the Pi and are not stored in Git.
Reproduction: `scripts/setup-office-homebridge.py` after package/plugin install.

Verified with Gallery offline: authenticated local X7 read and same-value write
succeeded; parent/child bridge, X7 API and AirPlay are active. Owner must create
Office UI credentials and pair the child via Plugins > Pi Home Audio > Connect
to HomeKit. Pairing the parent alone does not pair the child.

Bedroom already has an enabled local Homebridge with Katana and SwitchBot child
bridges; UI `http://192.168.2.89:8581`. Gallery already has Homebridge but was
unreachable during this migration. Its old X7 tile remains pending cleanup.
After Office pairing and Gallery recovery, deploy the updated plugin and run
`scripts/retire-gallery-x7.py` on Gallery, then restart its Homebridge. Other
Gallery plugins and pairing identities are preserved. Do not clone bridge
identities across Pis; this is independent hosting, not automatic failover.


## Native X7 receiver controls — 2026-10-21

Plugin 0.4.0 publishes the external receiver **Office X7 BF8E**, with linked
TelevisionSpeaker volume +/- (5 percentage-point steps), hardware mute and a
fixed USB source. The former Office volume-as-light accessory is removed.
The receiver must be paired separately from both the parent and child bridges.
Active means unmuted audio, not hardware power. The existing X7 hardware level
and mute state were left unchanged during deployment; no EQ or AirPlay changes.

After the external receiver has been paired, run `scripts/retire-gallery-x7.py`
on Gallery and restart only its Pi Home Audio child bridge to remove the old
forwarded X7 dimmer there. That cleanup is pending receiver pairing.

Validation: mock HAP tests verify native +/- and mute, speaker linkage, relative
volume capability and retirement of the legacy dimmer. Live deployment confirms
receiver publication and successful local X7 reads. Physical iPhone Remote
button operation remains to be confirmed after pairing. Original Office plugin
is backed up at `/var/backups/x7-receiver-20261021`.


## Home app fan-style volume — 2026-10-21

User selected fan rotation-speed sliders instead of light dimmers so Siri light
groups cannot alter speaker volume. Plugin 0.5.0 converts the X7 volume accessory
in place (same UUID) to a Fan named **Office Lautsprecher**. Both Office's local
plugin and Gallery's legacy forwarding plugin were updated. Only Office keeps
its already-paired optional external receiver. Katana plugin 0.2.2 similarly
exposes the volume fan **Soundbar**, separate from **Soundbar Licht** RGB lighting.
RotationSpeed = hardware volume, On = unmute, Off = mute. No actual volume, mute,
EQ or AirPlay settings were written during this migration. HAP service tests
confirm fan percentage/mute mapping and removal of Lightbulb volume services.
