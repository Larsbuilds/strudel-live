/** Shared session state for AI refine, autotune key-sync, save. */

export const session = {
  lastCode: '',
  lastPrompt: '',
  lastScale: null,
};

export function setLastPattern({ code, prompt, scale }) {
  if (code) session.lastCode = code;
  if (prompt) session.lastPrompt = prompt;
  if (scale !== undefined) session.lastScale = scale;
}
