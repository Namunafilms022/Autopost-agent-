export interface Script {
  id: string;
  user_id: string;
  brand_id: string | null;
  platform: string;
  topic: string;
  hook: string | null;
  script: string | null;
  cta: string | null;
  estimated_duration: string | null;
  scene_suggestions: string[];
  queue_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScriptInput {
  brand_id?: string | null;
  platform: string;
  topic: string;
  hook?: string;
  script?: string;
  cta?: string;
  estimated_duration?: string;
  scene_suggestions?: string[];
  queue_item_id?: string | null;
}
