set -eu
sudo install -d -m755 /opt/bedroom-now-playing
sudo install -m644 /tmp/server.py /tmp/index.html /opt/bedroom-now-playing/
sudo install -d -m700 /var/backups/pi-home-audio/pre-now-playing
sudo cp -n /usr/local/etc/shairport-sync.conf /var/backups/pi-home-audio/pre-now-playing/shairport-sync.conf
sudo tee /etc/tmpfiles.d/bedroom-now-playing.conf >/dev/null <<'EOF'
d /run/bedroom-now-playing 0750 shairport-sync pi -
p /run/bedroom-now-playing/metadata 0660 shairport-sync pi -
EOF
sudo systemd-tmpfiles --create /etc/tmpfiles.d/bedroom-now-playing.conf
sudo python3 - <<'PY'
p='/usr/local/etc/shairport-sync.conf'
s=open(p).read()
if 'metadata =' not in s:
 s+='\nmetadata = {\n enabled = "yes";\n include_cover_art = "yes";\n pipe_name = "/run/bedroom-now-playing/metadata";\n};\n'
open(p,'w').write(s)
PY
sudo tee /etc/systemd/system/bedroom-now-playing.service >/dev/null <<'EOF'
[Unit]
Description=Bedroom AirPlay Now Playing metadata display
After=systemd-tmpfiles-setup.service
[Service]
User=pi
ExecStart=/usr/bin/python3 /opt/bedroom-now-playing/server.py
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
[Install]
WantedBy=multi-user.target
EOF
sudo tee /usr/local/bin/bedroom-kiosk >/dev/null <<'EOF'
#!/bin/sh
xset s off
xset -dpms
xset s noblank
openbox &
exec chromium --kiosk --no-first-run --noerrdialogs --disable-session-crashed-bubble --disable-translate --password-store=basic --user-data-dir=/home/pi/.cache/bedroom-kiosk http://127.0.0.1:8090/
EOF
sudo chmod 755 /usr/local/bin/bedroom-kiosk
sudo tee /usr/local/bin/bedroom-display >/dev/null <<'EOF'
#!/bin/sh
while :; do
 if grep -qs '^connected$' /sys/class/drm/card*-HDMI-A-*/status; then
  startx /usr/local/bin/bedroom-kiosk -- :0 vt7 -nolisten tcp
 fi
 sleep 10
done
EOF
sudo chmod 755 /usr/local/bin/bedroom-display
sudo tee /etc/systemd/system/bedroom-display.service >/dev/null <<'EOF'
[Unit]
Description=Bedroom HDMI Now Playing kiosk
After=bedroom-now-playing.service systemd-user-sessions.service
Wants=bedroom-now-playing.service
[Service]
User=pi
PAMName=login
Environment=HOME=/home/pi
TTYPath=/dev/tty7
StandardInput=tty
TTYReset=yes
TTYVHangup=yes
ExecStart=/usr/local/bin/bedroom-display
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now bedroom-now-playing bedroom-display
sudo systemctl restart shairport-sync
