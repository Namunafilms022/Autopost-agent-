export interface PostingFrequency {
  posts_per_week: number;
  best_days: string[];
  best_times: string;
  consistency: string;
}

export interface CaptionStyle {
  tone: string;
  avg_length: string;
  structure: string;
  cta_style: string;
}

export interface BestHashtag {
  hashtag: string;
  usage_count: string;
  niche: string;
}

export interface ContentIdea {
  format: string;
  topic: string;
  performance: string;
}

export interface CompetitorAnalysis {
  id: string;
  user_id: string;
  handle: string;
  platform: string;
  posting_frequency: PostingFrequency;
  caption_style: CaptionStyle;
  best_hashtags: BestHashtag[];
  content_ideas: ContentIdea[];
  analysis: string | null;
  generated_at: string;
}

export const PLATFORMS_FOR_ANALYSIS = ['Instagram', 'TikTok', 'X', 'LinkedIn', 'YouTube'] as const;
