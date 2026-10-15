# Updates — 2026-10-15

Updated each Pi within its existing OS release, one at a time. No OS release
migration, new Homebridge server, Tailscale or AI-agent installation was done.

## Versions

| Host | OS | Kernel after reboot | Homebridge | Homebridge UI | Homebridge Node |
| --- | --- | --- | --- | --- | --- |
| Gallery | Debian 13 | 6.18.50+rpt-rpi-v8 | 2.4.0 | 5.29.0 | 24.22.0 |
| Bedroom | Debian 12 | 6.12.109+rpt-rpi-v8 | 2.4.0 | 5.29.0 | 24.22.0 |
| Office | Debian 13 | 6.18.50+rpt-rpi-v8 | Not installed | Not installed | Not applicable |

Shairport Sync 5.6 and NQPTP 1.2.9 were already the latest upstream stable
releases and were retained on all three. Office's PipeWire maintenance build
updated from 1.4.2-1+rpt3 to 1.4.2-1+rpt4.

Both SwitchBot plugins updated to 5.1.2. Roborock remains at latest 2.2.10
with the local email-code/password compatibility patch preserved. The custom
Pi Home Audio plugin remains 0.2.0, with its local tarball dependency repaired.

Katana's existing source compiled against Homebridge 2.4 and constructed its
real HAP television/speaker/volume services in a compatibility check, including
simulated state refresh. Its installed package now declares
`^1.6.0 || ^2.0.0` compatibility. The metadata change is reproducible through
`config/katana-homebridge2.patch`; no soundbar control commands were changed.

Bedroom's GitHub CLI repository signing key was refreshed from GitHub's
published keyring. Verified SHA256
`6084d5d7bd8e288441e0e94fc6275570895da18e6751f70f057485dc2d1a811b`
and fingerprint `7F38BBB59D064DBCB3D84D725612B36462313325`. Package signature
checking remained enabled.

## Backups

Each host has `/var/backups/pi-home-audio/pre-update-20261015/` containing:
- `config-and-custom-code.tar.gz`: /etc, boot configuration, Homebridge
  configuration/pairings, custom audio code and relevant user configuration.
- `packages.tsv`: installed package versions before the update.
- `apt-plan.txt`: the simulated package update plan.

These archives contain credentials and pairing keys. They are root-protected
and are not committed. Copies on the Mac are under the chat's
`work/private-backups/`, permission 0600; all three archives were opened and
checked for their expected configuration entries. They are configuration and
custom-code backups, not full SD-card images.

Homebridge plugin updates also create a dependency snapshot
`homebridge-node-modules.tar` in the host's backup directory. The OS package
may already have updated Homebridge core before that snapshot: the pre-update
core version was 1.11.2 and can be reinstalled explicitly if rollback is needed.
Restore Homebridge configuration and pairing state with the service stopped;
never advertise duplicate bridge identities from two hosts simultaneously.

## Validation

Office passed reboot recovery of Shairport, NQPTP, X7 API, UAC2 gadget,
PipeWire/WirePlumber, USB routing and EQ restoration. X7 retained 69% hardware
volume and the Flat EQ preset. Its PCM output is running; no undervoltage.

Gallery passed reboot recovery, all three child bridges listening on their
existing ports, Homebridge UI responding with setup completed, and the real
Homebridge-user volume read/write and lamp status checks. Its main and child
bridge identities match the pre-update backup. The new SwitchBot Bluetooth
and USB native dependencies load successfully. npm's top-level dependency tree
is clean. No OS package updates remained after installation.

Bedroom passed reboot recovery on kernel 6.12.109+rpt-rpi-v8. Its two child
bridges listen on ports 52201/52202, Katana's USB API reports healthy and reads
volume (56%, unmuted), and the new SwitchBot native Bluetooth/USB modules load.
Main and child bridge identities match its pre-update backup. Both Homebridge
servers report core 2.4.0, UI 5.29.0 and Node 24.22.0.

The final check on every Pi showed no pending package updates, no dpkg audit
issues and no failed systemd units. Bonjour discovery found Bedroom, Gallery
and Office. Office installed 33 package updates; Gallery installed 251 with
22 new dependencies and replaced libcamera0.6 with libcamera0.7; Bedroom
installed 170 updates with 11 new dependencies. No automatic autoremove ran.

Audible playback, sustained AirPlay group switching and physical Mac USB
input still require real-world listening/connection tests. These maintenance
checks do not prove the earlier Mac AirPlay clock/timeline failure is fixed.
Roborock remains set to the Europe endpoint, awaiting the user's fresh EU
account login/device discovery; updating Homebridge does not complete that
account linking automatically. Child-bridge pairing in Apple Home remains a
user step if not already completed.

References:
- https://github.com/homebridge/homebridge/wiki/Updating-To-Homebridge-v2.0
- https://github.com/homebridge/homebridge/wiki/How-To-Update-Node.js
- https://github.com/cli/cli/blob/trunk/docs/install_linux.md
