export interface VideoInput {
  topic: string;
  script: string | null;
  imageUrl: string | null;
  brandName: string | null;
  brandTone: string | null;
  platform: string | null;
  supabaseToken: string;
}

export interface VideoOutput {
  videoUrl: string;
  generationTime: number;
  provider: string;
  thumbnailUrl: string | null;
}

export interface VideoProvider {
  name: string;
  generate(input: VideoInput): Promise<VideoOutput>;
}

const providers = new Map<string, () => VideoProvider>();

export function registerProvider(name: string, factory: () => VideoProvider) {
  providers.set(name, factory);
}

export function getProvider(name?: string): VideoProvider {
  const key = name ?? process.env.VIDEO_PROVIDER ?? 'openrouter';
  const factory = providers.get(key);
  if (!factory) throw new Error(`Video provider "${key}" not found. Available: ${[...providers.keys()].join(', ')}`);
  return factory();
}

export function getAvailableProviders(): string[] {
  return [...providers.keys()];
}
