#!/bin/sh
set -eu
backup=/var/backups/pi-home-audio/pre-5.6.2
binary=/home/pi/pi-audio-5.6.2/shairport-sync/shairport-sync
"$binary" -V | grep '^5.6.2-'
sudo -n install -d -m 700 "$backup"
sudo -n cp -an /usr/local/bin/shairport-sync "$backup/shairport-sync"
sudo -n mkdir -p /etc/systemd/system/nqptp.service.d /etc/systemd/system/shairport-sync.service.d
printf '[Service]\nRestart=on-failure\nRestartSec=5\n' | sudo -n tee /etc/systemd/system/nqptp.service.d/recovery.conf >/dev/null
printf '[Unit]\nRequires=nqptp.service\nAfter=nqptp.service\nPartOf=nqptp.service\n' | sudo -n tee /etc/systemd/system/shairport-sync.service.d/timing-recovery.conf >/dev/null
sudo -n systemctl daemon-reload
sudo -n systemctl stop shairport-sync
sudo -n install -m 755 "$binary" /usr/local/bin/shairport-sync
sudo -n systemctl daemon-reload
sudo -n systemctl restart nqptp
sudo -n systemctl start shairport-sync
sleep 3
if ! systemctl is-active --quiet shairport-sync; then
 sudo -n cp "$backup/shairport-sync" /usr/local/bin/shairport-sync
 sudo -n systemctl restart shairport-sync
 exit 1
fi
/usr/local/bin/shairport-sync -V
systemctl is-active nqptp shairport-sync
