# Ableton Link

Gemeinsames Tempo-Grid mit CDJs, Ableton Live, Traktor (Link), etc.

## Server

Link läuft im Node-Prozess (`abletonlink` native Addon):

```bash
# .env
LINK_ENABLED=true    # false zum Deaktivieren
LINK_BPM=128         # Start-Tempo wenn kein Peer
```

Beim Start von `npm run dev` oder `npm run start` wird Link automatisch initialisiert.

## API

```bash
curl http://localhost:5173/api/link
# { ok, available, enabled, bpm, beat, phase, cpm, at }

curl -X POST http://localhost:5173/api/link \
  -H 'Content-Type: application/json' \
  -d '{"bpm":130}'
```

## Browser

Im Header: **Link-Sync** aktivieren → `setcpm(bpm/4)` folgt dem Link-Grid.

## CLI

```bash
npm run link:status
```

## Club-Setup

1. Alle Geräte im gleichen WLAN (oder Kabel + gleicher Switch).
2. Link in der DJ-Software aktivieren.
3. strudel-live starten — BPM übernimmt das Netzwerk-Grid.
4. **Link-Sync** im Browser einschalten.

## Hinweise

- Native Addon: auf manchen Systemen kann der Prozess beim Beenden mit Abort enden — im laufenden Server unkritisch.
- Strudel `setcpm(N)` = Zyklen pro Minute; bei 4/4 gilt `N = BPM / 4`.
