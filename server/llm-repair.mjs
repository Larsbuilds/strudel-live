import { callLLM } from './llm-call.mjs';
import { guardStrudelCode, validateStrudelSyntax } from './code-validate.mjs';
import { stripCodeFences } from './llm-utils.mjs';
import { fixScaleSyntaxInCode } from './music-constraints.mjs';

const REPAIR_SYSTEM = `You fix Strudel live-coding JavaScript syntax errors only.
Output ONLY the corrected executable code. No markdown fences, no explanation.
Keep all musical intent. Use .scale("NOTE:mode") format e.g. .scale("A:minor").`;

export async function repairStrudelCode(code, env, { error } = {}) {
  const scaled = fixScaleSyntaxInCode(code || '');
  const first = validateStrudelSyntax(scaled);
  if (first.ok) return { code: first.code, repaired: false, validation: first };

  const errMsg = error || first.error || 'syntax error';
  const { text } = await callLLM(
    REPAIR_SYSTEM,
    `Syntax error: ${errMsg}\n\nBroken code:\n${scaled}`,
    env,
    { maxTokens: 768 },
  );

  const fixed = fixScaleSyntaxInCode(stripCodeFences(text));
  const guarded = guardStrudelCode(fixed);
  return {
    code: guarded.code,
    repaired: true,
    validation: guarded.validation,
    rejectedError: errMsg,
  };
}
