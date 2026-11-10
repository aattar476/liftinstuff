#!/bin/bash
# One-step setup for the LiftinStuff receiver on the Mac mini. Safe to run
# again any time (after an app update, or if something stopped working):
#   1. copies the receiver into ~/liftinstuff-data (your dataset stays put)
#   2. (re)starts it as a login item that restarts itself if it crashes
#   3. shares it over Tailscale on port 8443 (your tailnet only, never public)
#   4. copies the address and pairing key so you can paste them on your phone
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/liftinstuff-data"
LABEL="com.drew.liftinstuff-receiver"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"
TS="$(command -v tailscale || echo /Applications/Tailscale.app/Contents/MacOS/Tailscale)"

echo "1/4 Copying the receiver to $DEST"
mkdir -p "$DEST/logs" "$HOME/Library/LaunchAgents"
chmod 700 "$DEST"
cp "$SRC/lift_receiver.py" "$SRC/lift_dataset.py" "$DEST/"
cp "$SRC/$LABEL.plist" "$PLIST"

echo "2/4 Starting it"
# Stop the old copy first so this works whether or not it was running.
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
sleep 1
launchctl bootstrap "$DOMAIN" "$PLIST"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  curl -fs -m 1 http://127.0.0.1:8096/health >/dev/null && break
  sleep 1
done
if ! curl -fs -m 1 http://127.0.0.1:8096/health >/dev/null; then
  echo "The receiver didn't start. Last lines of its log:"
  tail -n 20 "$DEST/logs/receiver.log" 2>/dev/null || true
  exit 1
fi
echo "    running on this Mac (127.0.0.1:8096)"

echo "3/4 Sharing it on your tailnet"
"$TS" serve --bg --https=8443 8096 >/dev/null
if "$TS" funnel status 2>/dev/null | grep -qi "funnel on"; then
  echo "WARNING: Tailscale Funnel is on, so something on this Mac is public."
  echo "Check with: $TS funnel status"
fi
HOST="$("$TS" status --json | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')"
URL="https://$HOST:8443"

echo "4/4 Pairing your phone"
echo
echo "  Mac address:  $URL"
echo
printf '%s' "$URL" | pbcopy
echo "The address is on your clipboard. On your iPhone (Tailscale on), open"
echo "LiftinStuff > More > Send to Mac and paste it into Mac address."
read -r -p "Press Return when done to copy the pairing key... " _
/usr/bin/python3 "$DEST/lift_receiver.py" --show-key | tr -d '\n' | pbcopy
echo "The pairing key is on your clipboard. Paste it into Pairing key."
echo "(It isn't printed here. Universal Clipboard needs Bluetooth + Handoff on.)"
read -r -p "Press Return once it's pasted to clear the clipboard... " _
printf '' | pbcopy
echo "Done. The app sends after every workout; check More > Send to Mac for 'Last sent'."
