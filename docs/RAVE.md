# RAVE ONNX Bridge

WebSocket `:8765` — Browser AudioWorklet ↔ Node ONNX ↔ Browser.

## Start

```bash
npm run rave:server

# Mit Modell (optional):
RAVE_MODEL_PATH=./models/rave.onnx npm run rave:server

# NVIDIA GPU (optional):
RAVE_EXECUTION_PROVIDER=cuda RAVE_MODEL_PATH=./models/rave.onnx npm run rave:server
```

## Env

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `RAVE_PORT` | `8765` | WebSocket-Port |
| `RAVE_MODEL_PATH` | — | Pfad zu `.onnx`; ohne Modell: Passthrough |
| `RAVE_EXECUTION_PROVIDER` | `cpu` | `cpu` oder `cuda` |

## Tensor-Pool (v0.6.2)

- Vorallokierte `Float32Array` für 512 und 1024 Samples
- ONNX-Shape `[1, 1, L]` — kein neuer Heap pro Frame
- `enableCpuMemArena: false`, `interOpNumThreads: 1` gegen Jitter/Leaks

## Latenz-Budget

Ziel: **&lt; 15 ms** Roundtrip. Server loggt Warnung wenn Inferenz &gt; 15 ms.

## Modell

RAVE-ONNX muss manuell exportiert werden — kein Modell im Repo. Ohne `RAVE_MODEL_PATH` läuft Passthrough (Mic → WS → Mic).
