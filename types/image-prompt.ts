export interface ImagePrompt {
  id: string;
  user_id: string;
  brand_id: string | null;
  platform: string | null;
  topic: string;
  caption: string | null;
  script: string | null;
  image_prompt: string | null;
  style: string | null;
  lighting: string | null;
  camera: string | null;
  composition: string | null;
  queue_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImagePromptInput {
  brand_id?: string | null;
  platform?: string | null;
  topic: string;
  caption?: string | null;
  script?: string | null;
  image_prompt?: string;
  style?: string;
  lighting?: string;
  camera?: string;
  composition?: string;
  queue_item_id?: string | null;
}
