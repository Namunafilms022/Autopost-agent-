import { callTextAI } from '@/lib/ai-config';

interface ModelConfig {
  primary: string;
  fallback: string;
}

const ROUTER_CONFIG: Record<string, ModelConfig> = {
  caption:      { primary: 'gemini-2.5-flash', fallback: 'openrouter-free' },
  title:        { primary: 'gemini-2.5-flash', fallback: 'openrouter-free' },
  description:  { primary: 'gemini-2.5-flash', fallback: 'openrouter-free' },
  hashtags:     { primary: 'gemini-2.5-flash', fallback: 'openrouter-free' },
  seo:          { primary: 'deepseek-v3',       fallback: 'gemini-2.5-flash' },
  imagePrompt:  { primary: 'deepseek-v3',       fallback: 'gemini-2.5-flash' },
  videoPrompt:  { primary: 'deepseek-v3',       fallback: 'gemini-2.5-flash' },
  translation:  { primary: 'gemini-2.5-flash', fallback: 'openrouter-free' },
};

export function getModelForTask(task: string): ModelConfig {
  return ROUTER_CONFIG[task] ?? ROUTER_CONFIG.caption;
}

export function getRouterConfig(): Record<string, ModelConfig> {
  return { ...ROUTER_CONFIG };
}

export async function generateCaption(prompt: string): Promise<string> {
  const result = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 512, temperature: 0.8 },
  );
  return result;
}

export async function generateTitle(prompt: string): Promise<string> {
  const result = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 256, temperature: 0.7 },
  );
  return result;
}

export async function generateHashtags(prompt: string): Promise<string> {
  const result = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 256, temperature: 0.6 },
  );
  return result;
}

export async function generateDescription(prompt: string): Promise<string> {
  const result = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 512, temperature: 0.7 },
  );
  return result;
}

export async function generateSEO(prompt: string): Promise<string> {
  const result = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 1024, temperature: 0.5 },
  );
  return result;
}

export async function generateImagePrompt(prompt: string): Promise<string> {
  const result = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 512, temperature: 0.8 },
  );
  return result;
}

export async function generateVideoPrompt(prompt: string): Promise<string> {
  const result = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 512, temperature: 0.8 },
  );
  return result;
}

export async function generateTranslation(prompt: string): Promise<string> {
  const result = await callTextAI(
    [{ role: 'user', content: prompt }],
    { maxTokens: 1024, temperature: 0.3 },
  );
  return result;
}
