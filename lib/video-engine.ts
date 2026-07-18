import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loading: Promise<void> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loading) {
    await loading;
    return ffmpeg!;
  }
  loading = (async () => {
    const f = new FFmpeg();
    f.on('log', ({ message }) => {
      if (message.includes('Error') || message.includes('error')) {
        console.error('[FFmpeg]', message);
      }
    });
    await f.load();
    ffmpeg = f;
  })();
  await loading;
  return ffmpeg!;
}

export async function generateVideoFromImage(
  imageUrl: string,
  durationSec: number = 5,
): Promise<Blob> {
  const f = await getFFmpeg();

  const imageData = await fetchFile(imageUrl);
  const fileName = `input_${Date.now()}.jpg`;
  await f.writeFile(fileName, imageData);

  const outputName = `output_${Date.now()}.mp4`;

  const zoom = Math.max(0.001, 0.003 * (durationSec / 5));
  const fps = 24;
  const totalFrames = durationSec * fps;
  const zoomFilter =
    `zoompan=z='if(eq(on,1),1,zoom+${zoom})':`
    + `x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':`
    + `d=${totalFrames}:s=1080x1920:fps=${fps}`;

  await f.exec([
    '-loop', '1',
    '-i', fileName,
    '-vf', zoomFilter,
    '-t', String(durationSec),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'ultrafast',
    '-y',
    outputName,
  ]);

  const data = await f.readFile(outputName);
  await f.deleteFile(fileName);
  await f.deleteFile(outputName);

  return new Blob([data as BlobPart], { type: 'video/mp4' });
}

export async function generateSlideshowFromImages(
  imageUrls: string[],
  totalDurationSec: number = 10,
): Promise<Blob> {
  const f = await getFFmpeg();
  const ts = Date.now();

  const imgCount = imageUrls.length;
  const segDuration = Math.max(2, totalDurationSec / imgCount);
  const fps = 24;
  const segFrames = Math.round(segDuration * fps);
  const zoom = Math.max(0.001, 0.004 * (segDuration / 3));

  const fileNames: string[] = [];
  for (let i = 0; i < imgCount; i++) {
    const name = `slide_${ts}_${i}.jpg`;
    const data = await fetchFile(imageUrls[i]);
    await f.writeFile(name, data);
    fileNames.push(name);
  }

  const outputName = `slideshow_${ts}.mp4`;

  // Build filter_complex: zoompan each image, then concat
  const filters: string[] = [];
  const inputs: string[] = [];
  for (let i = 0; i < imgCount; i++) {
    inputs.push(`[${i}:v]`);
    filters.push(
      `[${i}:v]zoompan=z='if(eq(on,1),1,zoom+${zoom})':`
      + `x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':`
      + `d=${segFrames}:s=1080x1920:fps=${fps}[s${i}]`
    );
  }

  const concatInputs = Array.from({ length: imgCount }, (_, i) => `[s${i}]`).join('');
  filters.push(`${concatInputs}concat=n=${imgCount}:v=1:a=0[v]`);

  const filterComplex = filters.join(';');
  const inputs_: string[] = [];
  for (const name of fileNames) {
    inputs_.push('-i', name);
  }

  await f.exec([
    ...inputs_,
    '-filter_complex', filterComplex,
    '-map', '[v]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'ultrafast',
    '-y',
    outputName,
  ]);

  const data = await f.readFile(outputName);
  for (const name of fileNames) {
    try { await f.deleteFile(name); } catch { /* ignore */ }
  }
  try { await f.deleteFile(outputName); } catch { /* ignore */ }

  return new Blob([data as BlobPart], { type: 'video/mp4' });
}
