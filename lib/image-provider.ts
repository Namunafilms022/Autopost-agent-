export interface ImageInput {
  prompt: string;
  supabaseToken: string;
}

export interface ImageOutput {
  imageUrl: string;
  generationTime: number;
  provider: string;
}

export interface ImageProvider {
  name: string;
  generate(input: ImageInput): Promise<ImageOutput>;
}

const providers = new Map<string, () => ImageProvider>();

export function registerImageProvider(name: string, factory: () => ImageProvider) {
  providers.set(name, factory);
}

export function getImageProvider(name?: string): ImageProvider {
  const key = name ?? process.env.IMAGE_PROVIDER ?? 'pollinations';
  const factory = providers.get(key);
  if (!factory) throw new Error(`Image provider "${key}" not found. Available: ${[...providers.keys()].join(', ')}`);
  return factory();
}

export function getAvailableImageProviders(): string[] {
  return [...providers.keys()];
}
