/**
 * Remove stack layers by concept — matches Strudel layer code heuristics.
 */
const MATCHERS = {
  'drums:kick': (line) => /\bbd\b/i.test(line) && /\bs\s*\(/i.test(line),
  'drums:snare': (line) => /\bsd\b/i.test(line) || (/\bs\s*\(/i.test(line) && /~\s*sd/i.test(line)),
  'drums:hats': (line) => /\bhh\b/i.test(line) || /hh\*/i.test(line),
  'drums:clap': (line) => /\bcp\b/i.test(line),
  'drums:openhat': (line) => /\boh\b/i.test(line),
  'drums:perc': (line) => /\bcp\b/i.test(line) && !/\bsd\b/i.test(line),
  'drums:roll': (line) => /hh\*(16|32)/i.test(line) && /\.speed\(/i.test(line),
  'bass:sub': (line) => /^note\s*\(/i.test(line) || (/^note\s*\(/i.test(line) && /\blpf\b/i.test(line)),
  'bass:reese': (line) => /^note\s*\(/i.test(line) && /sine\.range|distort/i.test(line),
  'acid:line': (line) => /^note\s*\(/i.test(line) && /distort|sine\.range/i.test(line),
  'pad:warm': (line) => (/^note\s*\(/i.test(line) || /^n\s*\(/i.test(line)) && /\.room\(/i.test(line),
  'lead:saw': (line) => /^n\s*\(/i.test(line) && /\.scale\(/i.test(line),
  'lead:arp': (line) => /^n\s*\(/i.test(line) && /\.fast\(/i.test(line),
  'texture:crush': (line) => /\.crush\(/i.test(line),
  'texture:noise': (line) => /white|noise/i.test(line),
};

function parseStackLayers(code) {
  const prev = code?.trim();
  if (!prev || !/stack\s*\(/i.test(prev)) return { head: prev, layers: [], hasStack: false };

  const match = prev.match(/^([\s\S]*?stack\s*\()\s*([\s\S]*)\)\s*$/i);
  if (!match) return { head: prev, layers: [], hasStack: false };

  const head = match[1];
  const body = match[2];
  const layers = [];
  let depth = 0;
  let current = '';

  for (const ch of body) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      const t = current.trim();
      if (t) layers.push(t);
      current = '';
      continue;
    }
    current += ch;
  }
  const last = current.trim();
  if (last) layers.push(last);

  return { head, layers, hasStack: true, tail: ')' };
}

export function layerMatchesTarget(layerCode, concept, variant) {
  const key = `${concept}:${variant}`;
  const fn = MATCHERS[key];
  if (fn) return fn(layerCode);
  if (concept === 'bass') return /^note\s*\(/i.test(layerCode) || (/^n\s*\(/i.test(layerCode) && /\blpf\b/i.test(layerCode));
  if (concept === 'drums') return /\bs\s*\(/i.test(layerCode);
  if (concept === 'pad') return /\.room\(/i.test(layerCode) || /^n\s*\(/i.test(layerCode);
  return false;
}

export function removeLayersFromPattern(code, targets = []) {
  const parsed = parseStackLayers(code);
  if (!parsed.hasStack || !targets.length) return null;

  const toRemove = new Set(targets.map((t) => `${t.concept}:${t.variant}`));
  const kept = [];
  let removed = 0;

  for (const layer of parsed.layers) {
    let drop = false;
    for (const t of targets) {
      if (toRemove.has(`${t.concept}:${t.variant}`) && layerMatchesTarget(layer, t.concept, t.variant)) {
        drop = true;
        break;
      }
    }
    if (drop) removed += 1;
    else kept.push(layer);
  }

  if (!removed) return null;
  if (!kept.length) return null;

  return {
    code: `${parsed.head}\n  ${kept.join(',\n  ')}\n)`,
    removed,
  };
}
