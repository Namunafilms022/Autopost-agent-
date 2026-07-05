export function extractJsonFromResponse(text: string): string {
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  return text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

export function tryParseJson<T>(text: string): { data?: T; error?: string } {
  try {
    return { data: JSON.parse(extractJsonFromResponse(text)) as T };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to parse JSON' };
  }
}
