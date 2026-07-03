import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

import { callTextAI } from '@/lib/ai-config';
import { registerProvider, type VideoInput, type VideoOutput, type VideoProvider } from '@/lib/video-provider';

async function generateScenePrompts(input: VideoInput): Promise<string[]> {
  const scriptContext = input.script ? `\n**Script:** ${input.script}` : '';
  const imageContext = input.imageUrl ? `\n**Reference Image:** ${input.imageUrl}` : '';
  const brandContext = input.brandName ? `\n**Brand:** ${input.brandName}${input.brandTone ? `\n**Tone:** ${input.brandTone}` : ''}` : '';

  const prompt = `You are a video storyboard director. Create a sequence of 4 visual scene descriptions for a short video.
The scenes should flow naturally and tell a visual story.

**Topic:** ${input.topic}${brandContext}${scriptContext}${imageContext}
**Platform:** ${input.platform || 'Social Media'}
**Duration:** 15-20 seconds total (4 scenes, ~4-5 seconds each)

Generate exactly 4 scene descriptions, one per line. Each description must be a single sentence covering subject, setting, lighting, mood, and camera angle.
Respond with ONLY the 4 lines, no numbering, no prefixes.`;

  const content = await callTextAI([{ role: 'user', content: prompt }], { maxTokens: 1024 });
  return content.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 4);
}

async function generateFrame(sceneDescription: string): Promise<string> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(sceneDescription)}?width=1920&height=1080&nologo=true`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pollinations error (${res.status}): ${body}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const b64 = buffer.toString('base64');
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${b64}`;
}

async function createVideoFromFrames(frameDataUrls: string[], token: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(tmpdir(), 'video-'));
  const frameFiles: string[] = [];

  try {
    for (let i = 0; i < frameDataUrls.length; i++) {
      const url = frameDataUrls[i];
      const filePath = path.join(tmpDir, `frame${String(i).padStart(2, '0')}.png`);

      if (url.startsWith('data:')) {
        const match = url.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/i);
        if (!match) throw new Error('Invalid base64 frame data');
        const buffer = Buffer.from(match[2], 'base64');
        fs.writeFileSync(filePath, buffer);
      } else {
        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
      }

      frameFiles.push(filePath);
    }

    const outputPath = path.join(tmpDir, 'output.mp4');
    const duration = 4;
    const frameCount = frameFiles.length;
    const totalDuration = frameCount * duration;

    const txtPath = path.join(tmpDir, 'files.txt');
    const txtContent = frameFiles.map((f) => `file '${f}'\nduration ${duration}`).join('\n') +
      `\nfile '${frameFiles[frameFiles.length - 1]}'`;

    fs.writeFileSync(txtPath, txtContent);

    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${txtPath}" -vsync vfr -pix_fmt yuv420p -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=24" -t ${totalDuration} -c:v libx264 -preset fast -crf 23 "${outputPath}"`,
      { stdio: 'pipe', timeout: 60000 },
    );

    const videoBuffer = fs.readFileSync(outputPath);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const videoPath = `generated/${crypto.randomUUID()}.mp4`;
    const { error: uploadError } = await supabase.storage.from('assets').upload(videoPath, videoBuffer, {
      contentType: 'video/mp4',
      upsert: false,
    });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('assets').getPublicUrl(videoPath);

    return publicUrl;
  } finally {
    for (const f of frameFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

const openrouterProvider: VideoProvider = {
  name: 'openrouter',

  async generate(input: VideoInput): Promise<VideoOutput> {
    const scenePrompts = await generateScenePrompts(input);

    const frameUrls: string[] = [];
    for (const scene of scenePrompts) {
      const frameUrl = await generateFrame(scene);
      frameUrls.push(frameUrl);
    }

    const startTime = Date.now();
    const videoUrl = await createVideoFromFrames(frameUrls, input.supabaseToken);
    const generationTime = Date.now() - startTime;

    return {
      videoUrl,
      generationTime,
      provider: 'openrouter',
      thumbnailUrl: null,
    };
  },
};

registerProvider('openrouter', () => openrouterProvider);
