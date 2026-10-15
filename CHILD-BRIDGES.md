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
