export interface PlatformConfig {
  name: string;
  captionLimit: number;
  hashtagLimit: number;
  description: string;
  formattingRules: string;
}

export const PLATFORMS: PlatformConfig[] = [
  {
    name: 'Instagram',
    captionLimit: 2200,
    hashtagLimit: 30,
    description: 'Visual-first platform. Emojis, conversational tone.',
    formattingRules:
      'Conversational and engaging. Use emojis naturally. Include line breaks between sections. End with 5-10 relevant hashtags.',
  },
  {
    name: 'Facebook',
    captionLimit: 63206,
    hashtagLimit: 30,
    description: 'Long-form friendly. Storytelling, community focus.',
    formattingRules:
      'Storytelling approach. Hook in the first line. Use short paragraphs with line breaks. Can include links. End with 3-5 hashtags.',
  },
  {
    name: 'LinkedIn',
    captionLimit: 3000,
    hashtagLimit: 30,
    description: 'Professional network. Thought leadership.',
    formattingRules:
      'Professional, value-driven tone. Start with a hook or question. Use line breaks. Include insights or data. End with 3-5 relevant hashtags.',
  },
  {
    name: 'X',
    captionLimit: 280,
    hashtagLimit: 10,
    description: 'Short-form microblogging. Concise, punchy.',
    formattingRules:
      'Extremely concise. Lead with the most important point. Use 1-2 hashtags max. Every character counts.',
  },
  {
    name: 'Threads',
    captionLimit: 500,
    hashtagLimit: 10,
    description: 'Casual microblogging. Authentic, conversational.',
    formattingRules:
      'Casual and authentic. Conversational, informal tone. Use 1-3 hashtags. Feel free to be playful.',
  },
  {
    name: 'TikTok',
    captionLimit: 2200,
    hashtagLimit: 30,
    description: 'Short-form video platform. Trendy, authentic.',
    formattingRules:
      'Trend-aware and authentic. Use hooks in first 3 seconds. Short, punchy captions. Include 3-5 relevant hashtags.',
  },
  {
    name: 'YouTube',
    captionLimit: 5000,
    hashtagLimit: 15,
    description: 'Long-form video platform. In-depth, educational.',
    formattingRules:
      'SEO-optimized titles. Start with a hook. Use timestamps for long videos. Include relevant hashtags in description.',
  },
];

export function getPlatform(name: string): PlatformConfig | undefined {
  return PLATFORMS.find((p) => p.name === name);
}
