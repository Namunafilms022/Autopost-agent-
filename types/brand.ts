export interface Brand {
  id: string;
  user_id: string;
  brand_name: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  primary_color: string;
  secondary_color: string;
  target_audience: string | null;
  brand_tone: string | null;
  language: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type BrandFormData = Omit<Brand, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export type BrandFormSubmit = BrandFormData & { logo_file?: File };

export const BRAND_TONES = [
  'Professional',
  'Casual',
  'Luxury',
  'Playful',
  'Authoritative',
  'Friendly',
  'Innovative',
  'Traditional',
  'Minimalist',
  'Bold',
] as const;

export const INDUSTRIES = [
  'Technology',
  'Fashion',
  'Food & Beverage',
  'Health & Wellness',
  'Finance',
  'Education',
  'Entertainment',
  'Real Estate',
  'Travel',
  'E-commerce',
  'Agency',
  'Other',
] as const;

export const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Nepali', value: 'ne' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Chinese', value: 'zh' },
] as const;
