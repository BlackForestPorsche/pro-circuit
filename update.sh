#!/bin/sh
# Pull widget changes from GitHub and reload the desktop widget when something new landed.
set -eu

WIDGET=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
ROOT=$(git -C "$WIDGET" rev-parse --show-toplevel)
BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)

cd "$ROOT"
OLD=$(git rev-parse HEAD)
git fetch origin "$BRANCH"
git merge --ff-only "origin/$BRANCH"
NEW=$(git rev-parse HEAD)

if [ "$OLD" = "$NEW" ]; then
  exit 0
fi

if kpackagetool6 -t Plasma/Applet -l | grep -q com.blackforest.procircuit; then
  kpackagetool6 -t Plasma/Applet -u "$WIDGET"
else
  kpackagetool6 -t Plasma/Applet -i "$WIDGET"
fi

if systemctl --user is-active plasma-plasmashell.service >/dev/null 2>&1; then
  systemctl --user restart plasma-plasmashell.service
fi
