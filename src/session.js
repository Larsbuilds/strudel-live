/** Shared session state across AI, DJ, mic, patterns. */

export const session = {
  lastCode: '',
  lastPrompt: '',
  lastScale: null,
  selectedTrack: null,
};

export function setLastPattern({ code, prompt, scale }) {
  if (code) session.lastCode = code;
  if (prompt) session.lastPrompt = prompt;
  if (scale !== undefined) session.lastScale = scale;
}

export function setSelectedTrack(track) {
  session.selectedTrack = track;
}
