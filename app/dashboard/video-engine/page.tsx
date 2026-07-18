'use client';

import {
  VideoIcon,
  Loader2,
  Download,
  Save,
  RefreshCw,
  Sparkles,
  ImageIcon,
  Wand2,
  Images,
  SquarePen,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { generateSlideshowFromImages } from '@/lib/video-engine';
import { uploadAsset } from '@/services/asset';

type Mode = 'slideshow' | 'ai';

export default function VideoEnginePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('slideshow');

  const [slideshowPrompt, setSlideshowPrompt] = useState('');
  const [imageCount, setImageCount] = useState(3);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);

  const [generating, setGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (mode === 'slideshow') {
      if (!slideshowPrompt.trim()) {
        toast.error('Enter a description for the images');
        return;
      }
    } else if (!prompt.trim()) {
      toast.error('Enter a video description');
      return;
    }

    setGenerating(true);
    setProgressText(mode === 'slideshow' ? 'Generating images...' : '');
    setVideoUrl(null);
    setVideoBlob(null);

    try {
      if (mode === 'slideshow') {
        setProgressText('Generating images...');
        const imgRes = await fetch('/api/generate/slideshow-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: slideshowPrompt.trim(),
            count: imageCount,
          }),
        });
        const imgData = await imgRes.json();
        if (!imgRes.ok) throw new Error(imgData.error || 'Failed to generate images');

        const images: string[] = imgData.images;
        setProgressText(`Creating video from ${images.length} images...`);
        const blob = await generateSlideshowFromImages(images, duration);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setVideoBlob(blob);
      } else {
        const res = await fetch('/api/generate/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt.trim(),
            aspectRatio: '9:16',
            duration,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Generation failed');

        if (data.videoUrl) {
          setVideoUrl(data.videoUrl);
          setVideoBlob(null);
        } else if (data.jobId) {
          setProgressText('Generating video...');
          let attempts = 0;
          const maxAttempts = 60;
          while (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 3000));
            attempts++;
            const statusRes = await fetch(
              `/api/generate/video/status?provider=${data.provider}&jobId=${data.jobId}`
            );
            const statusData = await statusRes.json();
            if (statusData.status === 'completed' && statusData.videoUrl) {
              setVideoUrl(statusData.videoUrl);
              break;
            }
            if (statusData.status === 'failed') {
              throw new Error(statusData.error || 'Video generation failed');
            }
          }
          if (!videoUrl) throw new Error('Video generation timed out');
        }
      }
      toast.success('Video generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
      setProgressText('');
    }
  };

  const handleSave = async () => {
    if (!videoUrl) return;
    setSaving(true);
    try {
      let file: File;
      if (videoBlob) {
        file = new File([videoBlob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });
      } else {
        const res = await fetch(videoUrl);
        const blob = await res.blob();
        file = new File([blob], `video_${Date.now()}.mp4`, { type: blob.type || 'video/mp4' });
      }
      const asset = await uploadAsset(file, {
        name: `AI Video ${new Date().toLocaleDateString()}`,
        tags: ['ai-video'],
      });
      toast.success('Video saved to assets');
      setVideoUrl(null);
      setVideoBlob(null);
      setSlideshowPrompt('');
      setPrompt('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePost = async () => {
    if (!videoUrl) return;
    setSaving(true);
    try {
      let file: File;
      if (videoBlob) {
        file = new File([videoBlob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });
      } else {
        const res = await fetch(videoUrl);
        const blob = await res.blob();
        file = new File([blob], `video_${Date.now()}.mp4`, { type: blob.type || 'video/mp4' });
      }
      const asset = await uploadAsset(file, {
        name: `AI Video ${new Date().toLocaleDateString()}`,
        tags: ['ai-video'],
      });
      router.push(`/dashboard/new-post?assetId=${asset.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `video_${Date.now()}.mp4`;
    a.click();
  };

  const handleReset = () => {
    setVideoUrl(null);
    setVideoBlob(null);
  };

  const generatingDuration = 3 + duration * 2;

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <VideoIcon className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Video Engine</h1>
          <p className="text-muted-foreground text-sm">
            Create short-form videos for TikTok
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Create Video</CardTitle>
              <CardDescription>Choose a method to generate your video</CardDescription>
            </div>
            <div className="flex gap-1 rounded-lg border p-1">
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === 'ai' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Wand2 className="h-3.5 w-3.5" />
                AI Video
              </button>
              <button
                type="button"
                onClick={() => setMode('slideshow')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === 'slideshow' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Images className="h-3.5 w-3.5" />
                Slideshow
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'slideshow' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="slideshowPrompt">Describe the images</Label>
                <Textarea
                  id="slideshowPrompt"
                  value={slideshowPrompt}
                  onChange={(e) => setSlideshowPrompt(e.target.value)}
                  placeholder="e.g. A cinematic sunrise over snowy mountains, tropical beach at golden hour, starry night sky"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  AI generates {imageCount} images from your description, then stitches them into a slideshow with Ken Burns zoom
                </p>
              </div>
              <div className="space-y-2">
                <Label>Number of images: {imageCount}</Label>
                <Input
                  type="range"
                  min={2}
                  max={5}
                  value={imageCount}
                  onChange={(e) => setImageCount(Number(e.target.value))}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2</span>
                  <span>More images = longer generation</span>
                  <span>5</span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="prompt">Video Description</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to generate... e.g. A cinematic sunrise over snowy mountains, slow zoom, warm golden light"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                AI video providers are currently unavailable (all need paid credits). Use Slideshow mode instead — it&apos;s free and unlimited.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="duration">Duration: {duration}s</Label>
            <Input
              id="duration"
              type="range"
              min={3}
              max={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3s</span>
              <span>Recommended: 5-15s for TikTok</span>
              <span>15s</span>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={
              generating
              || (mode === 'slideshow' && !slideshowPrompt.trim())
              || (mode === 'ai' && !prompt.trim())
            }
            className="w-full gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {progressText || (mode === 'ai' ? `Generating (~${generatingDuration}s)...` : 'Processing...')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Video
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {videoUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg"
              style={{ aspectRatio: '9/16', maxHeight: 500 }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                className="gap-2 flex-1"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 flex-1"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save to Assets
              </Button>
              <Button
                variant="secondary"
                onClick={handleCreatePost}
                disabled={saving}
                className="gap-2 flex-1"
              >
                <SquarePen className="h-4 w-4" />
                Use in New Post
              </Button>
              <Button
                variant="secondary"
                onClick={handleReset}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}