# Club-Härtetest (v0.6.2)

Vor dem ersten Gig mit strudel-live im Studio durchlaufen.

## Schnell-Check (~2 Min)

```bash
npm run dev:full          # Terminal 1
npm run stress:smoke      # Terminal 2
```

## Voller Gig-Härtetest (~2h+)

```bash
# Terminal 1 — App + Samples
npm run dev:full

# Terminal 2 — Link (braucht laufenden Server mit Link)
npm run stress:link

# Terminal 3 — RAVE (optional Modell)
npm run rave:server       # wenn RAVE im Set
STRESS_DURATION=7200 npm run stress:rave
# oder WS-Pfad:
STRESS_DURATION=7200 npm run stress:rave -- --ws
```

---

## 1. Verbindungstrennungs-Test (Link)

**Ziel:** Nach 15s Netz-Ausfall PI-Lock in ≤3 Cycles, kein hörbarer Tempo-Sprung.

### Automatisiert

```bash
npm run stress:link
```

Simuliert WS-Drop + PI-Re-Lock mit Mock-Scheduler (gleiche Kp/Ki/dt wie Browser).

### Manuell (empfohlen zusätzlich)

1. Pattern in Strudel starten (z. B. `patterns/07-dj-stems.strudel`)
2. **Link-Sync (PI)** aktivieren
3. WLAN oder Ethernet **15 Sekunden** trennen
4. Verbindung wiederherstellen
5. **Pass:** Takt innerhalb von 2–3 Bars wieder stabil, kein Pitch-Wobble

---

## 2. RAVE-Dauerschleife

**Ziel:** RAM flach über 2 Stunden bei 512 Samples @ 44,1 kHz (~86 fps).

```bash
RAVE_MODEL_PATH=./models/rave.onnx npm run rave:server   # Terminal A
STRESS_DURATION=7200 npm run stress:rave                  # Terminal B
```

Parallel `htop` / Activity Monitor auf den `node`-Prozess.

| Metrik | Pass |
|--------|------|
| RSS-Wachstum nach 30s Warmup | ≤ 100 MB über gesamte Laufzeit |
| Frame-Fehler | 0 |
| Inferenz (wenn ONNX) | meist &lt; 15 ms |

Ohne Modell (`Passthrough`) prüft der Test nur die Pipeline — für Club **echtes ONNX-Modell** verwenden.

---

## Env-Referenz

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `STRESS_DURATION` | `60` | RAVE-Laufzeit (Sekunden); `7200` = 2h |
| `STRESS_LINK_OUTAGE_SEC` | `15` | Simulierte WS-Outage |
| `STRESS_LINK_MAX_CYCLES` | `3` | Max Cycles bis Phasen-Lock |
| `STRESS_MAX_RSS_MB` | `100` | Max RSS-Wachstum (MB) |

---

## Checkliste vor dem Gig

- [ ] `npm run audit` grün
- [ ] `npm run stress:link` grün
- [ ] `STRESS_DURATION=7200 npm run stress:rave` grün (wenn RAVE aktiv)
- [ ] Manueller WLAN-Test mit Link-Sync (PI)
- [ ] `npm run panic` getestet
- [ ] `OPENAI_API_KEY` gültig
- [ ] Prompt-Buch-Chip einmal durchgespielt
