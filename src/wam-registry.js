/**
 * Known WAM plugins — loaded dynamically from CDN (Phase 11).
 * @see https://webaudiomodules.org/wamsynths/
 */
export const WAM_PLUGINS = [
  {
    id: 'obxd',
    name: 'OB-Xd (Oberheim)',
    url: 'https://plugins.webaudiomodules.org/obxd/index.js',
    description: 'Analog poly synth WASM',
  },
  {
    id: 'dx7',
    name: 'Dexed (DX7)',
    url: 'https://plugins.webaudiomodules.org/dexed/index.js',
    description: 'FM synth WASM',
  },
  {
    id: 'meld',
    name: 'Meld',
    url: 'https://plugins.webaudiomodules.org/meld/index.js',
    description: 'WAM community synth',
  },
];
