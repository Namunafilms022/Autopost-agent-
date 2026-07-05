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

function extractJsonValue(text: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`"${escaped}"\\s*:\\s*"`);
  const match = regex.exec(text);
  if (!match) return null;

  let i = match.index + match[0].length;
  let value = '';
  let depth = 0;
  let inEscape = false;

  for (; i < text.length; i++) {
    const ch = text[i];
    if (inEscape) {
      value += ch;
      inEscape = false;
      continue;
    }
    if (ch === '\\') {
      value += ch;
      inEscape = true;
      continue;
    }
    if (ch === '"') {
      if (depth === 0) break;
      depth--;
      value += ch;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth++;
      value += ch;
      continue;
    }
    if (ch === '}' || ch === ']') {
      if (depth === 0) break;
      depth--;
      value += ch;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      value += ' ';
      continue;
    }
    value += ch;
  }

  return value;
}

export function tryParseJson<T>(text: string): { data: T; error?: undefined } | { data?: undefined; error: string } {
  const extracted = extractJsonFromResponse(text);

  try {
    return { data: JSON.parse(extracted) as T };
  } catch {
    // Fallback: extract each field individually
    const result: Record<string, unknown> = {};
    const keys = ['caption', 'hashtags', 'imagePrompt', 'title', 'image_prompt', 'hook', 'script', 'cta',
      'estimatedDuration', 'estimated_duration', 'sceneSuggestions', 'scene_suggestions',
      'videoPrompt', 'video_prompt', 'videoStyle', 'video_style', 'videoDuration', 'video_duration',
      'videoMusicVibe', 'video_music_vibe', 'style', 'lighting', 'camera', 'composition',
      'imageUrl', 'image_url', 'generationTime', 'generation_time', 'provider'];

    for (const key of keys) {
      const value = extractJsonValue(extracted, key);
      if (value !== null) {
        // Try parsing as JSON (for arrays, numbers, booleans)
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      }
    }

    // Parse sceneSuggestions separately (array format)
    const scenesMatch = extracted.match(/"sceneSuggestions"\s*:\s*(\[[\s\S]*?\])/);
    if (scenesMatch) {
      try {
        result.sceneSuggestions = JSON.parse(scenesMatch[1]);
      } catch {
        const items: string[] = [];
        const itemRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
        let m;
        while ((m = itemRegex.exec(scenesMatch[1])) !== null) {
          items.push(m[1]);
        }
        result.sceneSuggestions = items;
      }
    }

    if (Object.keys(result).length > 0) {
      return { data: result as T };
    }

    return { error: 'Failed to parse AI response: could not extract any fields' };
  }
}
