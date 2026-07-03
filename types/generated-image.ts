export interface GeneratedImage {
  id: string;
  user_id: string;
  brand_id: string | null;
  platform: string | null;
  topic: string;
  prompt: string;
  image_url: string;
  generation_time: number;
  provider: string;
  queue_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedImageInput {
  brand_id?: string | null;
  platform?: string | null;
  topic: string;
  prompt: string;
  image_url: string;
  generation_time: number;
  provider?: string;
  queue_item_id?: string | null;
}
