import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    error: 'AI video generation is currently unavailable. All previous providers have insufficient credits:\n'
      + '- Magic Hour (Wan 2.2): free credits exhausted, watermark on videos\n'
      + '- Runbase: $0.10 balance — insufficient\n'
      + '- Seedance & Veo3: "No credit"\n'
      + '- Skywalk/APIFree: $0 balance\n'
      + '\nUse the free Slideshow mode on the Video Engine page (no API key needed, unlimited).',
  }, { status: 503 });
}
