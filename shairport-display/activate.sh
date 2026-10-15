set -eu
cd /home/pi/shairport-metadata-display
printf 'NODE_ENV=production\nFIFO=/run/bedroom-now-playing/metadata\nPORT=3600\nIMG_FORMAT=webp\nMAX_FILES_CACHED=30\n' > .env
python3 - <<'PY'
p='app.js';s=open(p).read().replace('server.listen(port, () => {','server.listen(port, "127.0.0.1", () => {');open(p,'w').write(s)
PY
sudo tee /etc/systemd/system/shairport-display.service >/dev/null <<'EOF'
[Unit]
Description=Shairport Metadata Display
After=systemd-tmpfiles-setup.service
[Service]
User=pi
WorkingDirectory=/home/pi/shairport-metadata-display
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=5
NoNewPrivileges=true
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl disable --now bedroom-now-playing
sudo sed -i 's/After=bedroom-now-playing.service/After=shairport-display.service/;s/Wants=bedroom-now-playing.service/Wants=shairport-display.service/' /etc/systemd/system/bedroom-display.service
sudo sed -i 's|http://127.0.0.1:8090/|http://127.0.0.1:3600/|' /usr/local/bin/bedroom-kiosk
sudo systemctl daemon-reload
sudo systemctl enable --now shairport-display
sudo systemctl restart bedroom-display
