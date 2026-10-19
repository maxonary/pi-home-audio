# Gallery Roborock Q10 compatibility

Local compatibility layer for `homebridge-roborock-vacuum` 2.2.10, limited to
`roborock.vacuum.ss07` (Q10 S5). Preserves the existing child bridge and accessory
identities, configuration, login and HomeKit pairing.

The bundled driver encoded B01 traffic using the Q7 method/msgId envelope.
Q10 instead uses numeric DPS directly. Login and discovery succeeded while
commands and reads timed out.

- On: whole-home clean (`201: {cmd: 1}`), or resume (`205: 0`) when paused.
- Off: stop (`206: 0`), then return to charge (`202: 5`).
- Status: request DPS (`102: {}`), translate pushed state/battery into HomeKit.
- Commands wait up to seven seconds for a matching fresh device status, with
  short status polling during confirmation. MQTT delivery alone is not success.
- Returning is represented as off; charging and battery update from the device.
- Binary Q10 map packets are ignored rather than decoded as legacy photo data.
- Unsupported legacy reads are skipped for this model. Native room/scene controls,
  maps, consumable polling and fault-code translation have not been added.
- Other models keep the original code path.

Protocol references (accessed 2026-10-19):
- https://github.com/Python-roborock/python-roborock/blob/main/roborock/protocols/b01_q10_protocol.py
- https://github.com/Python-roborock/python-roborock/blob/main/roborock/devices/traits/b01/q10/vacuum.py
- https://github.com/andrewlyeats/roborock-q10-cli/blob/main/DP_DICTIONARY.md

## Install and rollback

Run `sudo python3 install.py` on Gallery from this directory. The installer checks
exact original/patched file hashes and refuses unknown versions. It backs up the
original files before applying `compat.patch`. Restart only the Roborock child
bridge afterwards. This is a local patch: a plugin upgrade can overwrite it;
reassess upstream support before upgrading or reapplying.

The initial live backup is `/var/backups/roborock-q10-prepatch`. Restore its
`roborockAPI.js` to `roborockLib/`, `vacuum.js` and
`roborock_mqtt_connector.js` to `roborockLib/lib/`, and `vacuum_accessory.js` to
`dist/`; then restart the Roborock child bridge. Do not reset pairing data.

Run `node test-q10.js` for protocol/status mapping and mocked lifecycle tests.
Runtime diagnostics in `/var/lib/homebridge/q10-status.json` contain only a
last-update timestamp, numeric state and battery, not credentials or device IDs.

## Live validation (2026-10-19)

On Gallery, the existing paired Q10 S5 reported state 10 (paused), battery 99%.
Verified via the Homebridge HAP accessory:

- On while paused: state changed to 104 (vacuum+mop); resume confirmed.
- Off: stop confirmed, then state 6 (returning); state 8 (charging) followed.
- On from charging: a new whole-home clean reached state 104.
- Off again: stop and return confirmed.

No robot network settings, cleaning preferences, maps, schedules, account
credentials or HomeKit identities were changed. Only this plugin's child process
was restarted. Source/protocol tests and patch application checks passed.
