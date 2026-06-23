const SAMPLE_SERVER = 'http://localhost:5432';
const STEM_NAMES = ['drums', 'bass', 'vocals', 'other'];
const DEFAULT_SMOOTH_ALPHA = 0.2;

function getAverageVolume(analyser) {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum / data.length / 255;
}

function resolveStemUrls(track) {
  const urls = {};
  const id = track.id;

  if (track.stems?.length) {
    for (const stemPath of track.stems) {
      const base = stemPath.replace(/^soundcloud\//, '').replace(/\.wav$/, '');
      const name = STEM_NAMES.find((n) => base.endsWith(`-${n}`) || base === n);
      if (name) urls[name] = `${SAMPLE_SERVER}/${stemPath}${stemPath.endsWith('.wav') ? '' : '.wav'}`;
    }
  }

  for (const name of STEM_NAMES) {
    if (!urls[name]) {
      urls[name] = `${SAMPLE_SERVER}/soundcloud/${id}-${name}.wav`;
    }
  }
  return urls;
}

let bridge = null;

class StemAnalyserBridge {
  constructor() {
    this.ctx = null;
    this.elements = [];
    this.analysers = {};
    this.rafId = null;
    this.active = false;
    this._levels = {};
    this._raw = {};
    this._smooth = {};
    this._alpha = DEFAULT_SMOOTH_ALPHA;
  }

  setSmoothingAlpha(alpha) {
    this._alpha = Math.max(0.05, Math.min(1, alpha));
  }

  async start(track) {
    this.stop();
    if (!track?.id) throw new Error('Track ohne ID');

    this.ctx = new AudioContext();
    const urls = resolveStemUrls(track);
    const loaded = [];

    for (const name of STEM_NAMES) {
      const url = urls[name];
      try {
        const head = await fetch(url, { method: 'HEAD' });
        if (!head.ok) continue;

        const audio = new Audio(url);
        audio.loop = true;
        audio.crossOrigin = 'anonymous';

        const source = this.ctx.createMediaElementSource(audio);
        const analyser = this.ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.001;

        source.connect(analyser);
        analyser.connect(gain);
        gain.connect(this.ctx.destination);

        await audio.play();
        this.analysers[name] = analyser;
        this.elements.push(audio);
        loaded.push(name);
      } catch {
        /* stem file missing — skip */
      }
    }

    if (loaded.length === 0) {
      this.stop();
      throw new Error('Keine Stems gefunden — npm run dj:stems + npm run dev:full');
    }

    this.active = true;
    this.publishGlobals();
    this.tick();

    return loaded;
  }

  publishGlobals() {
    const levels = this._levels;
    const raw = this._raw;
    const fns = {};
    const rawFns = {};
    for (const name of STEM_NAMES) {
      fns[name] = () => levels[name] ?? 0;
      rawFns[name] = () => raw[name] ?? 0;
    }
    window.dj_stems = fns;
    window.dj_stems_raw = rawFns;
    window.dj_stems_levels = levels;
  }

  smoothValue(name, raw) {
    const prev = this._smooth[name] ?? raw;
    const next = this._alpha * raw + (1 - this._alpha) * prev;
    this._smooth[name] = next;
    return next;
  }

  tick() {
    if (!this.active) return;
    for (const name of STEM_NAMES) {
      if (this.analysers[name]) {
        const raw = getAverageVolume(this.analysers[name]);
        this._raw[name] = raw;
        this._levels[name] = this.smoothValue(name, raw);
      }
    }
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  stop() {
    this.active = false;
    cancelAnimationFrame(this.rafId);
    for (const el of this.elements) {
      el.pause();
      el.src = '';
    }
    this.elements = [];
    this.analysers = {};
    if (this.ctx?.state !== 'closed') this.ctx?.close();
    this.ctx = null;
    delete window.dj_stems;
    delete window.dj_stems_raw;
    delete window.dj_stems_levels;
    this._levels = {};
    this._raw = {};
    this._smooth = {};
  }

  getLevels() {
    return { ...this._levels };
  }
}

export function getStemBridge() {
  if (!bridge) bridge = new StemAnalyserBridge();
  return bridge;
}

export async function startStemAnalysis(track) {
  return getStemBridge().start(track);
}

export function stopStemAnalysis() {
  getStemBridge().stop();
}

export function stemLevelsForPrompt() {
  const b = getStemBridge();
  if (!b.active) return '';
  const l = b.getLevels();
  return `Current stem FFT levels (0-1): drums=${l.drums?.toFixed(2) ?? 0}, bass=${l.bass?.toFixed(2) ?? 0}, vocals=${l.vocals?.toFixed(2) ?? 0}, other=${l.other?.toFixed(2) ?? 0}`;
}
