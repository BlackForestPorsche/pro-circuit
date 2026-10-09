# Pro Circuit

KDE Plasma 6 desktop widget for Dota 2 pro games. Live scores, YouTube streams, and Liquipedia dates.

## Install on Manjaro

Open a terminal:

```sh
git clone https://github.com/BlackForestPorsche/pro-circuit.git ~/.local/share/pro-circuit
bash ~/.local/share/pro-circuit/install.sh
```

Right-click the desktop, choose **Enter Edit Mode**, then **Add Widgets**, and drag **Pro Circuit** onto the desktop. Choose **Exit Edit Mode**.

## What it shows

- Games on now: score, clock, spectators, and a Watch button when Liquipedia lists a YouTube channel.
- Running, next, and just finished events, with how many days until they start or end.
- Qualifiers stay off the date list until you turn **Qualifiers** on. Live qualifier games still show.

## Updates

The install adds a timer that checks this repo every 30 minutes, and about 2 minutes after you log in. When `main` has a new commit, the widget reinstalls and the desktop shell reloads once.

If you already cloned the private shop branch, replace that copy:

```sh
rm -rf ~/.local/share/pro-circuit
git clone https://github.com/BlackForestPorsche/pro-circuit.git ~/.local/share/pro-circuit
bash ~/.local/share/pro-circuit/install.sh
```
