export interface Asset {
  id: string;
  user_id: string;
  brand_id: string | null;
  name: string;
  type: 'image' | 'video';
  mime_type: string;
  size_bytes: number;
  url: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AssetUploadInput {
  name: string;
  brand_id?: string | null;
  tags?: string[];
}
