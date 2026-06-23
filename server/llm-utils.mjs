export function stripCodeFences(text) {
  return text
    .replace(/^```(?:javascript|js|json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

export function stripFences(text) {
  return stripCodeFences(text);
}
