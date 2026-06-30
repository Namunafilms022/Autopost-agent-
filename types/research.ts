export interface ResearchTopic {
  topic: string;
  reason: string;
  platform: string;
  trend_score: number;
}

export interface ResearchHashtag {
  hashtag: string;
  posts_estimate: string;
  category: string;
  relevance: string;
}

export interface ResearchAudio {
  title: string;
  creator: string;
  genre: string;
  mood: string;
  why_trending: string;
}

export interface ResearchIdea {
  title: string;
  format: string;
  hook: string;
  estimated_reach: string;
}

export interface ContentResearch {
  id: string;
  user_id: string;
  brand_id: string | null;
  industry: string | null;
  topics: ResearchTopic[];
  hashtags: ResearchHashtag[];
  audio: ResearchAudio[];
  ideas: ResearchIdea[];
  generated_at: string;
}

export const RESEARCH_PROMPT = `You are a social media trend researcher. Generate a comprehensive trend report with realistic, actionable data.

Return ONLY valid JSON (no markdown, no code blocks):

{
  "topics": [
    {
      "topic": "[Specific trending topic idea]",
      "reason": "[Why this is trending now]",
      "platform": "[Instagram | TikTok | X | LinkedIn | YouTube]",
      "trend_score": [1-100]
    }
  ],
  "hashtags": [
    {
      "hashtag": "[trending hashtag without #]",
      "posts_estimate": "[e.g. 2.5M posts]",
      "category": "[e.g. Industry, Lifestyle, Seasonal]",
      "relevance": "[Why relevant to this brand/industry]"
    }
  ],
  "audio": [
    {
      "title": "[Trending audio/song name]",
      "creator": "[Creator name]",
      "genre": "[Genre]",
      "mood": "[Mood/vibe]",
      "why_trending": "[Why this audio is trending]"
    }
  ],
  "ideas": [
    {
      "title": "[Viral content idea title]",
      "format": "[Reel | Carousel | Story | Post | Thread | Video]",
      "hook": "[The opening hook that grabs attention]",
      "estimated_reach": "[e.g. 50K-100K reach]"
    }
  ]
}

Requirements:
- Generate 5-8 items per category.
- Make them realistic, specific, and currently plausible.
- Tailor to the brand's industry and niche.
- Trend scores should vary (not all 100).`;
