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
# { ok, available, enabled, bpm, beat, phase, peers, cpm, at }

curl -X POST http://localhost:5173/api/link \
  -H 'Content-Type: application/json' \
  -d '{"bpm":130}'
```

## WebSocket (v0.6.1)

`ws://localhost:5173/api/link/ws` — ~60 Hz Clock-Updates:

```json
{
  "type": "LINK_CLOCK_UPDATE",
  "payload": {
    "bpm": 128,
    "beat": 42.5,
    "phase": 0.5,
    "peers": 2,
    "cpm": 32,
    "serverTime": 1782213708337
  }
}
```

## Browser (PI-Sync)

Im Header: **Link-Sync (PI)** aktivieren — der Strudel-Scheduler folgt dem Link-Grid über einen **PI-Regler** (`setCps`), ohne Code im Editor umzuschreiben.

- Latenz-Kompensation über `serverTime` + RTT-Schätzung
- Anti-Windup auf dem Integrator (verhindert Tempo-Sprünge nach Reconnect)

Pattern-Code behält `setcpm()` für initiales Tempo; PI trimmt die laufende Clock.

## CLI

```bash
npm run link:status
```

## Club-Setup

1. Alle Geräte im gleichen WLAN (oder Kabel + gleicher Switch).
2. Link in der DJ-Software aktivieren.
3. strudel-live starten — BPM übernimmt das Netzwerk-Grid.
4. Pattern starten, dann **Link-Sync (PI)** einschalten.

## Hinweise

- Native Addon: auf manchen Systemen kann der Prozess beim Beenden mit Abort enden — im laufenden Server unkritisch.
- Strudel `setcpm(N)` = Zyklen pro Minute; bei 4/4 gilt `N = BPM / 4`. PI arbeitet intern mit CPS (`bpm / 240`).

## PI-Tuning (v0.6.2)

| Parameter | Wert |
|-----------|------|
| Kp | 0.12 |
| Ki | 0.015 |
| Integrator-Clamp | ±0.05 (mit `dt`) |
| Latenz | `serverTime` + RTT-Schätzung |
