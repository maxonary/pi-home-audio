#!/bin/sh
# Build first, then install the matched stable release pair with rollback.
set -eu
stage=/home/pi/pi-audio-5.6
backup=/var/backups/pi-home-audio/pre-5.6
case "${1:-}" in
build)
  mkdir -p "$stage"
  test -d "$stage/nqptp/.git" || git clone --depth 1 --branch 1.2.9 https://github.com/mikebrady/nqptp.git "$stage/nqptp"
  test -d "$stage/shairport-sync/.git" || git clone --depth 1 --branch 5.6 https://github.com/mikebrady/shairport-sync.git "$stage/shairport-sync"
  cd "$stage/nqptp"
  autoreconf -fi
  ./configure
  make -j2
  cd "$stage/shairport-sync"
  confdir=/etc
  test "$(hostname)" != airplay || confdir=/usr/local/etc
  autoreconf -fi
  pwflag=
  # Preserve Office's shared DSP/USB audio backend when rebuilding.
  if grep -q 'output_backend = "pipewire"' "$confdir/shairport-sync.conf" 2>/dev/null; then
    pwflag=--with-pipewire
  fi
  ./configure --sysconfdir="$confdir" --with-alsa --with-soxr --with-avahi --with-ssl=openssl --with-airplay-2 --with-metadata $pwflag
  make -j2
  echo BUILD_READY
  ;;
install)
  test -x "$stage/nqptp/nqptp"
  test -x "$stage/shairport-sync/shairport-sync"
  sudo -n install -d -m 700 "$backup"
  if ! sudo -n test -f "$backup/shairport-sync"; then
    sudo -n cp -a /usr/local/bin/shairport-sync /usr/local/bin/nqptp "$backup/"
  fi
  sudo -n systemctl stop shairport-sync nqptp
  sudo -n install -m 755 "$stage/nqptp/nqptp" /usr/local/bin/nqptp
  sudo -n install -m 755 "$stage/shairport-sync/shairport-sync" /usr/local/bin/shairport-sync
  sudo -n systemctl reset-failed shairport-sync nqptp
  sudo -n systemctl start nqptp
  sleep 1
  sudo -n systemctl start shairport-sync
  sleep 2
  if ! systemctl is-active --quiet nqptp || ! systemctl is-active --quiet shairport-sync; then
    sh "$0" rollback
    exit 1
  fi
  /usr/local/bin/shairport-sync -V
  /usr/local/bin/nqptp -V
  ;;
rollback)
  sudo -n systemctl stop shairport-sync nqptp
  sudo -n cp -a "$backup/nqptp" "$backup/shairport-sync" /usr/local/bin/
  sudo -n systemctl reset-failed shairport-sync nqptp
  sudo -n systemctl start nqptp
  sleep 1
  sudo -n systemctl start shairport-sync
  ;;
*) echo 'Usage: upgrade-airplay.sh build|install|rollback' >&2; exit 2 ;;
esac
