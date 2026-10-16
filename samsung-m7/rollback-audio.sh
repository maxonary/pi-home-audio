#!/bin/sh
# Restore the original audio configuration; retain the dedicated NQPTP user fix.
set -eu
sudo systemctl stop shairport-sync
sudo cp /var/backups/m7-network/shairport-sync.conf /usr/local/etc/shairport-sync.conf
sudo cp /var/backups/m7-network/shairport-sync /usr/local/bin/shairport-sync
sudo rm -f /etc/systemd/system/shairport-sync.service.d/m7-network.conf
sudo systemctl daemon-reload
sudo systemctl disable --now m7-network
sudo systemctl start shairport-sync
