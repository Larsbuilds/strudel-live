/**
 * Lightweight Strudel syntax guard via Acorn — prevents broken KI code from reaching REPL.
 * See docs/V0.6-ROADMAP.md
 */
import * as acorn from 'acorn';

function prepareForParse(code) {
  return code
    .replace(/^```(?:javascript|js)?\s*/gim, '')
    .replace(/```\s*$/gim, '')
    .replace(/^\$\s*:\s*/gm, '')
    .trim();
}

export function validateStrudelSyntax(code) {
  const cleaned = prepareForParse(code);
  if (!cleaned) return { ok: false, error: 'empty code' };

  try {
    acorn.parse(`(() => { ${cleaned} })()`, {
      ecmaVersion: 2022,
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
    });
    return { ok: true, code: cleaned };
  } catch (err) {
    return { ok: false, error: err.message, code: cleaned };
  }
}

/**
 * Validate and optionally fall back to previous working pattern.
 */
export function guardStrudelCode(code, { fallback } = {}) {
  const validation = validateStrudelSyntax(code);
  if (validation.ok) {
    return { code: validation.code, validation, usedFallback: false };
  }
  if (fallback) {
    const fb = validateStrudelSyntax(fallback);
    if (fb.ok) {
      return {
        code: fb.code,
        validation: fb,
        usedFallback: true,
        rejectedError: validation.error,
      };
    }
  }
  throw Object.assign(new Error(`Strudel syntax invalid: ${validation.error}`), {
    status: 422,
    validation,
  });
}
