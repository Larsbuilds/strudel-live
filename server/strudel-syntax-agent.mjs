/**
 * Syntax agent — second LLM (Strudel Coder) for Strudel code generation.
 *
 * The semantic stack (intents + catalog RAG + agent plan) runs first without an LLM.
 * This agent turns that structured context into executable, dynamic Strudel JS.
 */
import { SYSTEM_PROMPT } from './system-prompt.mjs';
import { ollamaChat, buildOllamaMessages, getSyntaxModel, isDualLlmEnabled } from './ollama.mjs';
import { looksLikeStrudelMusic } from './strudel-agent.mjs';
import { getLayer } from './strudel-catalog.mjs';

export const SYNTAX_AGENT_SYSTEM = `${SYSTEM_PROMPT}

You receive a music brief from a semantic planner (intents, catalog layers, BPM context).
Output ONLY executable Strudel JavaScript — no markdown, no JSON tools, no explanation.
Use the suggested layers as inspiration but make the pattern unique: vary gains, euclidean rhythms,
perlin/sine modulation, delays, and scale choices. stack() with 4–6 layers minimum.`;

export function buildSyntaxBrief(prompt, { agentPlan, previousCode, trackContext } = {}) {
  const lines = [];

  if (agentPlan?.intents?.length) {
    lines.push(
      'Planner intents:',
      ...agentPlan.intents.map(
        (i) => `- ${i.label} [${i.concept}/${i.variant}] uses: ${(i.functions || []).join(', ') || 'catalog'}`,
      ),
      '',
    );
  }

  if (agentPlan?.rag?.text) {
    lines.push('Strudel catalog (RAG):', agentPlan.rag.text, '');
  }

  const layerHints = (agentPlan?.tools || [])
    .filter((t) => t.name === 'append_layer')
    .map((t) => {
      const layer = getLayer(t.args?.concept, t.args?.variant);
      return layer?.code ? `// ${t.args?.label || t.args?.variant}\n${layer.code}` : null;
    })
    .filter(Boolean);

  if (layerHints.length) {
    lines.push('Suggested catalog layers (adapt and combine):', layerHints.join('\n\n'), '');
  }

  if (trackContext?.bpm || trackContext?.id) {
    let ctx = `DJ context: track "${trackContext.name || trackContext.id}"`;
    if (trackContext.bpm) ctx += ` at ${trackContext.bpm} BPM`;
    if (trackContext.key) ctx += `, key ${trackContext.key}`;
    lines.push(ctx, '');
  }

  if (previousCode?.trim()) {
    lines.push(
      'Current pattern (modify — keep what works, apply the request):',
      previousCode.trim(),
      '',
      `Modification: ${prompt}`,
    );
  } else {
    lines.push(`Create a new Strudel pattern: ${prompt}`);
  }

  return lines.join('\n');
}

/** Refine with deterministic tool hits — syntax LLM adds little value. */
export function shouldSkipSyntaxAgent({ isRefine, agentPlan }) {
  if (!isRefine || !agentPlan?.tools?.length) return false;

  const toolOnly = agentPlan.tools.every((t) =>
    ['append_layer', 'remove_layer', 'set_bpm', 'load_preset'].includes(t.name),
  );
  if (!toolOnly) return false;

  return agentPlan.layersAdded > 0 || agentPlan.layersRemoved > 0;
}

export function shouldUseSyntaxAgent(env, { isRefine, agentPlan, orchestratorResult } = {}) {
  if (!isDualLlmEnabled(env) || !getSyntaxModel(env)) return false;
  if (shouldSkipSyntaxAgent({ isRefine, agentPlan })) return false;

  // New patterns: semantic stack → Strudel Coder (primary codegen path)
  if (!isRefine) return true;

  // Creative refine: orchestrator failed or produced weak / tool JSON garbage
  if (orchestratorResult?.toolsUsed) return false;
  const code = orchestratorResult?.code;
  if (code && looksLikeStrudelMusic(code) && code.length > 80) return false;

  return true;
}

export async function generateWithSyntaxAgent(prompt, env, { agentPlan, previousCode, trackContext } = {}) {
  const brief = buildSyntaxBrief(prompt, { agentPlan, previousCode, trackContext });
  const { text, model } = await ollamaChat(
    buildOllamaMessages(SYNTAX_AGENT_SYSTEM, brief),
    env,
    { model: getSyntaxModel(env), maxTokens: 1200, temperature: 0.55 },
  );

  return {
    code: text,
    model,
    provider: 'ollama-syntax',
    raw: text,
    syntaxAgent: true,
  };
}

export { isDualLlmEnabled, getSyntaxModel };
