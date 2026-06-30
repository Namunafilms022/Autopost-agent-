export interface DailyEntry {
  day: number;
  date: string;
  platform: string;
  content_type: string;
  topic: string;
  caption_preview: string;
  hashtags: string[];
  goal: string;
  status: 'draft' | 'scheduled' | 'posted';
}

export interface ContentPlan {
  id: string;
  user_id: string;
  name: string;
  days: DailyEntry[];
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export const CONTENT_TYPES = [
  'Post', 'Reel', 'Carousel', 'Story', 'Video', 'Thread',
] as const;

export const PLANNER_PROMPT = `You are a social media content strategist. Create a 30-day content calendar.

Return ONLY valid JSON (no markdown, no code blocks) with a "days" array of 30 entries:

{
  "name": "[A catchy name for this plan]",
  "days": [
    {
      "day": 1,
      "platform": "[Instagram | TikTok | LinkedIn | X | Facebook]",
      "content_type": "[Post | Reel | Carousel | Story | Video | Thread]",
      "topic": "[Specific content topic for this day]",
      "caption_preview": "[1-2 sentence caption preview]",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "goal": "[Awareness | Engagement | Traffic | Sales | Community]"
    }
  ]
}

Requirements:
- Generate exactly 30 days with variety in platforms and content types.
- Space out platform usage — don't use the same platform 3 days in a row.
- Topics should follow a logical narrative arc across the 30 days.
- Each entry should have 3-5 hashtags.
- Goals should vary based on content type.
- Make topics specific and actionable, not generic.`;
