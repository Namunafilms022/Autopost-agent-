export interface GeneratedVideo {
  id: string;
  user_id: string;
  brand_id: string | null;
  platform: string | null;
  topic: string;
  script: string | null;
  image_url: string | null;
  video_url: string;
  thumbnail_url: string | null;
  scene_prompts: string[];
  generation_time: number;
  provider: string;
  queue_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedVideoInput {
  brand_id?: string | null;
  platform?: string | null;
  topic: string;
  script?: string | null;
  image_url?: string | null;
  video_url: string;
  thumbnail_url?: string | null;
  scene_prompts?: string[];
  generation_time: number;
  provider?: string;
  queue_item_id?: string | null;
}
