export interface UserProfile {
  id: string;
  user_id: string;
  writing_style: string | null;
  emoji_preference: string | null;
  caption_length: string | null;
  cta_preference: string | null;
  favorite_hashtags: string[];
  preferred_platforms: string[];
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileInput {
  writing_style?: string;
  emoji_preference?: string;
  caption_length?: string;
  cta_preference?: string;
  favorite_hashtags?: string[];
  preferred_platforms?: string[];
  additional_notes?: string;
}

export const WRITING_STYLES = [
  'Professional',
  'Casual',
  'Humorous',
  'Inspirational',
  'Luxury',
  'Authoritative',
  'Friendly',
  'Bold',
  'Minimalist',
  'Playful',
] as const;

export const EMOJI_PREFERENCES = [
  { value: 'frequent', label: 'Frequent 😊🔥🎉' },
  { value: 'occasional', label: 'Occasional ✨' },
  { value: 'none', label: 'None — Text only' },
] as const;

export const CAPTION_LENGTHS = [
  { value: 'short', label: 'Short & Punchy (under 150 chars)' },
  { value: 'medium', label: 'Medium (150-500 chars)' },
  { value: 'long', label: 'Long & Detailed (500+ chars)' },
] as const;

export const PLATFORM_OPTIONS = [
  'Instagram',
  'Facebook',
  'LinkedIn',
  'X',
  'Threads',
] as const;

export function buildProfileContext(profile: UserProfileInput | null): string {
  if (!profile) return '';
  const parts: string[] = [];

  if (profile.writing_style) {
    parts.push(`- Writing style: ${profile.writing_style}`);
  }
  if (profile.emoji_preference) {
    if (profile.emoji_preference === 'frequent') parts.push('- Use emojis frequently throughout the caption');
    else if (profile.emoji_preference === 'occasional') parts.push('- Use emojis sparingly (1-2 per post)');
    else if (profile.emoji_preference === 'none') parts.push('- Do NOT use any emojis');
  }
  if (profile.caption_length) {
    if (profile.caption_length === 'short') parts.push('- Keep captions short and punchy (under 150 characters)');
    else if (profile.caption_length === 'medium') parts.push('- Write medium-length captions (150-500 characters)');
    else if (profile.caption_length === 'long') parts.push('- Write detailed, long-form captions (500+ characters)');
  }
  if (profile.cta_preference) {
    parts.push(`- Call to action: ${profile.cta_preference}`);
  }
  if (profile.favorite_hashtags?.length) {
    parts.push(`- Favorite hashtags (use when relevant): ${profile.favorite_hashtags.join(', ')}`);
  }
  if (profile.preferred_platforms?.length) {
    parts.push(`- Preferred platforms: ${profile.preferred_platforms.join(', ')}`);
  }
  if (profile.additional_notes) {
    parts.push(`- Additional notes: ${profile.additional_notes}`);
  }

  if (parts.length === 0) return '';

  return `\n\n**User Profile & Preferences (follow these):**\n${parts.join('\n')}`;
}
