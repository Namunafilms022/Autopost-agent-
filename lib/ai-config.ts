const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const POLLINATIONS_TEXT = 'https://text.pollinations.ai';

const FREE_MODELS = [
  'liquid/lfm-2.5-1.2b-instruct:free',
  'poolside/laguna-xs.2:free',
  'cohere/north-mini-code:free',
];

function buildGoogleContents(messages: { role: string; content: string }[]) {
  let systemInstruction: string | null = null;
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else {
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
    }
  }

  const body: Record<string, unknown> = { contents, generationConfig: {} };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  return body;
}

async function callGoogleAI(messages: { role: string; content: string }[], maxTokens: number, temperature: number): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const body = buildGoogleContents(messages);
  body.generationConfig = { maxOutputTokens: maxTokens, temperature };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(
      `${GOOGLE_API_BASE}/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`Google AI error (${res.status}): ${body.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;

    return null;
  } catch (err) {
    console.warn('Google AI call failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function callOpenRouterFree(messages: { role: string; content: string }[], maxTokens: number, temperature: number): Promise<string | null> {
  for (const model of FREE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const res = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('retry-after') ?? '5', 10);
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
          throw new Error(`OpenRouter error (${res.status})`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) return content;

        throw new Error('Empty response');
      } catch (err) {
        if (attempt === 1) {
          console.warn(`OpenRouter model ${model} failed:`, err instanceof Error ? err.message : err);
        } else {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  }

  return null;
}

async function callPollinationsText(prompt: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${POLLINATIONS_TEXT}/${encodeURIComponent(prompt.slice(0, 2000))}`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      if (text) return text;
    }
  } catch (err) {
    console.warn('Pollinations text fallback failed:', err instanceof Error ? err.message : err);
  }

  return null;
}

export async function callTextAI(
  messages: { role: string; content: string }[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const maxTokens = options?.maxTokens ?? 1024;
  const temperature = options?.temperature ?? 0.7;
  const lastMessage = messages[messages.length - 1]?.content ?? '';

  // 1. Try Google AI Studio
  const googleResult = await callGoogleAI(messages, maxTokens, temperature);
  if (googleResult) return googleResult;

  // 2. Try OpenRouter free models
  const openrouterResult = await callOpenRouterFree(messages, maxTokens, temperature);
  if (openrouterResult) return openrouterResult;

  // 3. Fallback to Pollinations text
  const pollinationsResult = await callPollinationsText(lastMessage);
  if (pollinationsResult) return pollinationsResult;

  throw new Error('All AI text providers failed');
}
