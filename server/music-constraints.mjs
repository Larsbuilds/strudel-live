/**
 * Deterministic music constraints — fast guardrails, not theorem proving.
 * See docs/MUSIC-LOGIC.md for Isabelle vs Z3 evaluation.
 */

const BPM_MIN = 60;
const BPM_MAX = 200;

/** Strudel expects "A:minor", not "A2 minor" or "A minor". */
export function toStrudelScale(scaleLabel) {
  if (!scaleLabel?.trim()) return null;
  const s = scaleLabel.trim();
  if (s.includes(':')) return s;

  const m = s.match(/^([A-Ga-g])([#b]?)(\d+)?\s*(.*)$/);
  if (!m) return s;
  const note = `${m[1].toUpperCase()}${m[2] || ''}`;
  let mode = (m[4] || 'major').toLowerCase().replace(/\s+/g, '');
  if (!mode || mode === 'min') mode = 'minor';
  else if (mode.includes('minor')) mode = 'minor';
  else if (mode.includes('major') || mode === 'maj') mode = 'major';
  else if (mode.includes('dorian')) mode = 'dorian';
  else if (mode.includes('pentatonic')) mode = mode.includes('minor') ? 'pentatonic minor' : 'pentatonic';
  return `${note}:${mode}`;
}

export function fixScaleSyntaxInCode(code) {
  return code.replace(/\.scale\s*\(\s*['"]([^'"]+)['"]\s*\)/gi, (_full, inner) => {
    const fixed = toStrudelScale(inner) || inner;
    return `.scale("${fixed}")`;
  });
}

function extractCpm(code) {
  const m = code.match(/setcpm\s*\(\s*([\d.]+)/i);
  return m ? Number(m[1]) : null;
}

function hasScale(code, scaleLabel) {
  if (!scaleLabel) return true;
  const norm = scaleLabel.toLowerCase().replace(/\s+/g, ' ');
  const scaleRe = /\.scale\s*\(\s*['"]([^'"]+)['"]/i;
  const m = code.match(scaleRe);
  if (!m) return false;
  return m[1].toLowerCase().replace(/\s+/g, ' ').includes(norm.split(' ')[0]);
}

export function applyMusicConstraints(code, { bpm, scale } = {}) {
  let out = code?.trim() || '';
  const issues = [];
  const fixes = [];

  if (!out.includes('setcpm') && !out.includes('setcps')) {
    const targetBpm = bpm || 120;
    const cpm = targetBpm / 4;
    out = `setcpm(${cpm})\n${out}`;
    fixes.push(`injected setcpm(${cpm})`);
  }

  const cpm = extractCpm(out);
  if (cpm != null) {
    const inferredBpm = cpm * 4;
    if (inferredBpm < BPM_MIN || inferredBpm > BPM_MAX) {
      issues.push(`BPM ${Math.round(inferredBpm)} outside ${BPM_MIN}–${BPM_MAX}`);
      const clamped = Math.max(BPM_MIN, Math.min(BPM_MAX, bpm || 120));
      out = out.replace(/setcpm\s*\(\s*[\d.]+\s*\)/i, `setcpm(${clamped / 4})`);
      fixes.push(`clamped BPM to ${clamped}`);
    } else if (bpm && Math.abs(inferredBpm - bpm) > 6) {
      out = out.replace(/setcpm\s*\(\s*[\d.]+\s*\)/i, `setcpm(${bpm / 4})`);
      fixes.push(`aligned BPM to manifest ${bpm}`);
    }
  }

  if (scale && !hasScale(out, scale)) {
    const strudelScale = toStrudelScale(scale);
    if (!out.includes('.scale(')) {
      const noteMatch = out.match(/(n\s*\([^)]+\))/);
      if (noteMatch) {
        out = out.replace(noteMatch[1], `${noteMatch[1]}.scale("${strudelScale}")`);
        fixes.push(`added .scale("${strudelScale}")`);
      } else {
        issues.push(`missing .scale("${strudelScale}")`);
      }
    } else {
      issues.push(`scale mismatch: expected "${strudelScale}"`);
    }
  }

  out = fixScaleSyntaxInCode(out);

  if (out.length > 8000) {
    issues.push('code too long');
  }

  return {
    ok: issues.length === 0,
    code: out,
    issues,
    fixes,
  };
}
