interface MediaInfo {
  type: 'image' | 'video' | 'text' | 'slideshow';
  url?: string;
}

interface Capability {
  platform: string;
  image: boolean;
  video: boolean;
  text: boolean;
  slideshow: boolean;
  notes: string;
  maxDuration?: number;
  minDuration?: number;
}

const CAPABILITIES: Capability[] = [
  { platform: 'Instagram', image: true, video: true, text: false, slideshow: true, notes: 'Requires image or video for feed posts', maxDuration: 3600, minDuration: 1 },
  { platform: 'Facebook',  image: true, video: true, text: true,  slideshow: true, notes: '', maxDuration: 14400, minDuration: 1 },
  { platform: 'LinkedIn',  image: true, video: true, text: true,  slideshow: true, notes: '', maxDuration: 600, minDuration: 1 },
  { platform: 'X',         image: true, video: true, text: true,  slideshow: true, notes: '', maxDuration: 140, minDuration: 1 },
  { platform: 'TikTok',    image: false, video: true, text: false, slideshow: true, notes: 'Requires video; image will use slideshow conversion', maxDuration: 600, minDuration: 1 },
  { platform: 'YouTube',   image: false, video: true, text: false, slideshow: true, notes: 'Requires video or slideshow; image-only not supported', maxDuration: 43200, minDuration: 1 },
];

export interface ValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
  conversions: string[];
}

export function getCapability(platform: string): Capability | undefined {
  return CAPABILITIES.find(c => c.platform.toLowerCase() === platform.toLowerCase());
}

export function validateMedia(
  platforms: string[],
  media: MediaInfo,
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const conversions: string[] = [];

  for (const platform of platforms) {
    const cap = getCapability(platform);
    if (!cap) {
      errors.push(`${platform}: Unknown platform`);
      continue;
    }

    if (media.type === 'image') {
      if (!cap.image) {
        if (cap.slideshow) {
          conversions.push(`${platform}: Image → slideshow conversion`);
          warnings.push(`${platform}: Will convert image to slideshow`);
        } else {
          errors.push(`${platform}: Does not support image-only posts`);
        }
      }
    } else if (media.type === 'video') {
      if (!cap.video) {
        errors.push(`${platform}: Does not support video posts`);
      }
    } else if (media.type === 'text') {
      if (!cap.text) {
        if (cap.image) {
          warnings.push(`${platform}: Text-only posts need an auto-generated image`);
        } else {
          errors.push(`${platform}: Text-only posts not supported`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
    conversions,
  };
}
