#!/bin/sh
# Install Pro Circuit onto this KDE desktop and check GitHub for changes every half hour.
set -eu

WIDGET=$(CDPATH= cd -- "$(dirname "$0")" && pwd)

if ! git -C "$WIDGET" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This copy is not a git checkout, so it cannot auto-update."
  echo "Clone the GitHub repo first, then run this script from that clone."
  exit 1
fi

if ! command -v kpackagetool6 >/dev/null 2>&1; then
  echo "kpackagetool6 is missing. On Manjaro KDE it comes with Plasma."
  exit 1
fi

if kpackagetool6 -t Plasma/Applet -l | grep -q com.blackforest.procircuit; then
  kpackagetool6 -t Plasma/Applet -u "$WIDGET"
else
  kpackagetool6 -t Plasma/Applet -i "$WIDGET"
fi

UNIT_DIR=${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user
mkdir -p "$UNIT_DIR"

cat > "$UNIT_DIR/pro-circuit-update.service" <<EOF
[Unit]
Description=Update the Pro Circuit desktop widget

[Service]
Type=oneshot
ExecStart=$WIDGET/update.sh
EOF

cat > "$UNIT_DIR/pro-circuit-update.timer" <<EOF
[Unit]
Description=Check GitHub for Pro Circuit widget changes

[Timer]
OnBootSec=2min
OnUnitInactiveSec=30min
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now pro-circuit-update.timer

echo "Pro Circuit is installed."
echo "Right-click the desktop, choose Enter Edit Mode, Add Widgets, and drag Pro Circuit onto the desktop."
echo "It checks GitHub every 30 minutes. When a change is there, the widget reloads itself."
