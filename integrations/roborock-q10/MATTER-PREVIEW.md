# Q10 native vacuum tile preview (2026-10-31)

Adds a native Matter robotic vacuum alongside the existing paired HAP fan.
The fan stays available until the owner pairs and verifies the native vacuum.
No HAP identity, credentials, maps or cleaning preferences are changed.

Requires the existing Q10 `q10.js` compatibility layer and the exact plugin build
recorded in `matter-preview-manifest.json`. Apply `matter-preview.patch` only
when original hashes match. The patch touches `dist/platform.js` and
`dist/vacuum_matter_accessory.js`. Keep it separate from the core DPS control
patch because this layer is experimental and can be rolled back independently.

Plugin config additions:

```json
{
  "q10MatterPreview": true,
  "_bridge": {
    "matter": {"enabled": true, "port": 5530}
  }
}
```

Merge into the existing configuration; retain every existing `_bridge` property.
Restart Homebridge so the parent process reloads the child configuration.
Homebridge 2.4.0 requires an object: `_bridge.matter: true` causes a runtime
`Cannot create property 'port' on boolean 'true'` error in its child manager.

The preview exposes start/resume, stop, pause, go home and battery. Cleaning mode
is one fixed `Roborock app settings` mode: preferences remain controlled by the
Roborock app, avoiding unsupported V1 setters on the Q10. Room selection and
maps are not added. The native Stop action stops in place; Go Home returns to
the dock. The original HAP Off action still stops and returns to the dock.

Matter state reporting uses the raw Q10 state: 6=seeking charger, 8=charging,
102/103/104=cleaning. It must not inherit the HAP fan's 6-to-off normalization.
The test script calls real native-accessory handlers with a mocked device API,
checking Q10 state normalization and delegation without moving the robot:

```sh
ROBOROCK_PLUGIN_DIR=/var/lib/homebridge/node_modules/homebridge-roborock-vacuum \
  /opt/homebridge/bin/node test-matter.cjs
```

Original live config and native files are backed up on Gallery under
`/var/backups/roborock-before-matter-20261031`. To rollback, restore the two
original JS files and original config, restart Homebridge, and retain all
pairing/persist data. A plugin update can overwrite these local changes.

The Matter preview has its own commissioning code. The owner must add it to
Apple Home before the native tile is usable. Pairing and physical native-control
validation are separate from successful publication; do not remove the fan
until both have been checked.

Live preparation result: the native RoboticVacuumCleaner node was published on
UDP 5531 on Gallery; current robot state is charging (8), battery 100%. Existing
HAP pairing is retained. Native pairing and physical Apple Home commands remain
pending owner commissioning. The separate vacuum QR is generated from its own
`commissioning.json` QR payload, never from a hand-assembled code. Do not commit
that file, the generated QR, or account/token/pairing data.

After native commissioning and validation, set `matterDevices` to the Q10's
existing account device ID and disable/remove `q10MatterPreview`, then restart
Homebridge. This uses the plugin's normal Matter-only device path and retires
its HAP fan. Reassign room/automations as needed; do not remove the old fan before
native validation. The preview flag must remain enabled until that migration,
or the cache reconciliation would remove the pilot Matter accessory.
