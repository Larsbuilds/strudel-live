import '@strudel/repl';
import { initAiPanel } from './ai-panel.js';
import { initMicPanel } from './mic-panel.js';
import { initMidiPanel } from './midi-panel.js';
import { initVoiceInput } from './voice-input.js';
import { initWhisperRecorder } from './whisper-recorder.js';
import { initDjPanel } from './dj-panel.js';
import { initDjController } from './dj-controller.js';
import { initWamHost } from './wam-host.js';
import { initSynthDefPanel } from './synthdef-panel.js';
import { initConductorPanel } from './conductor-panel.js';
import { initFaustPanel } from './faust-host.js';
import { initRavePanel } from './rave-client.js';
import { initPanicButton } from './panic.js';
import { initLinkSync } from './link-sync.js';
import { initQuantizeCue } from './quantize-cue.js';
import { setQuantizeCueHandler } from './conductor-panel.js';
import { createWorkflowHub } from './workflow-hub.js';
import { initPatternPicker } from './pattern-picker.js';
import { initTransport } from './transport.js';
import { initNowPlaying } from './now-playing.js';
import { initSessionLog } from './session-log.js';
import { initOnce, resetInits } from './init-once.js';

const cleaners = [];

function bootstrap() {
  const editor = document.getElementById('repl');
  const picker = document.getElementById('pattern-picker');
  const promptInput = document.getElementById('ai-prompt');

  const hub = createWorkflowHub(editor);

  initOnce('session-log', () =>
    initSessionLog({ hub, promptInput: document.getElementById('ai-prompt') }),
  );

  const { refresh: refreshPatterns } = initPatternPicker({
    picker,
    onSelect: (code, meta) => hub.applyPattern(code, meta),
  });

  if (import.meta.hot) {
    import.meta.hot.on('strudel-live:patterns-changed', () => {
      refreshPatterns();
    });
  }

  initOnce('ai-panel', () => initAiPanel({ editor, hub }));
  initOnce('voice', () => initVoiceInput({ promptInput }));
  initOnce('whisper', () =>
    initWhisperRecorder({
      promptInput,
      onTranscript: (text) => {
        promptInput.value = text;
        const refineBtn = document.getElementById('ai-refine');
        if (refineBtn && hub?.isPlaying?.()) {
          refineBtn.click();
          document.getElementById('ai-form')?.requestSubmit(refineBtn);
        } else {
          document.getElementById('ai-form')?.requestSubmit();
        }
      },
    }),
  );

  initOnce('mic', () => initMicPanel());
  initOnce('midi', () => initMidiPanel());
  initOnce('dj', () => initDjPanel({ hub }));
  initOnce('dj-ctrl', () => initDjController());
  initOnce('wam', () => initWamHost());
  initOnce('visuals', () => import('./visuals-panel.js').then((m) => m.initVisualsPanel()));
  initOnce('hydra', () => import('./hydra-panel.js').then((m) => m.initHydraPanel()));
  initOnce('synthdef', () => initSynthDefPanel());
  initOnce('conductor', () => initConductorPanel({ hub, editor }));
  initOnce('faust', () => initFaustPanel());
  initOnce('rave', () => initRavePanel());

  initOnce('quantize-cue', () => {
    const cue = initQuantizeCue(editor);
    setQuantizeCueHandler((phase) => cue.onQuantizeTick(phase));
    cleaners.push(() => cue.dispose());
  });

  initOnce('transport', () => initTransport(editor, hub));
  initOnce('now-playing', () => initNowPlaying(editor, hub));
  initOnce('dj-faders', () => import('./dj-faders.js').then((m) => m.initDjFaders()));

  initOnce('panic', () => {
    const panic = initPanicButton(editor);
    cleaners.push(() => panic.dispose());
  });

  initOnce('link', () => {
    const link = initLinkSync(editor);
    cleaners.push(() => link.dispose());
  });

  initOnce('patterns-saved', () => {
    window.addEventListener('strudel-live:patterns-saved', () => refreshPatterns());
  });

  initOnce('patterns-init', () => {
    void refreshPatterns();
  });
}

if (!globalThis.__strudelLiveBootstrapped) {
  globalThis.__strudelLiveBootstrapped = true;
  bootstrap();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleaners.forEach((clean) => clean());
    cleaners.length = 0;
    resetInits();
    delete globalThis.__strudelLiveBootstrapped;
  });
}
