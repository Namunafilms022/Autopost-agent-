'use client';

import {
  Sparkles, ImageIcon, Video, CalendarDays, Copy, Check, Send, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { createQueueItem } from '@/services/queue';
import { PLATFORMS } from '@/lib/platforms';

type Step = 'topic' | 'caption' | 'image' | 'video' | 'schedule' | 'done';

interface GeneratedContent {
  caption: string;
  hashtags: string;
  imagePrompt: string;
  imageUrl: string;
  videoPrompt: string;
  videoStyle: string;
  videoDuration: string;
  videoMusicVibe: string;
}

export default function CreatePage() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [step, setStep] = useState<Step>('topic');
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<GeneratedContent>({
    caption: '', hashtags: '', imagePrompt: '', imageUrl: '', videoPrompt: '', videoStyle: '', videoDuration: '', videoMusicVibe: '',
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const steps: { key: Step; label: string; icon: typeof Sparkles }[] = [
    { key: 'topic', label: 'Topic', icon: Sparkles },
    { key: 'caption', label: 'Caption', icon: Sparkles },
    { key: 'image', label: 'Image', icon: ImageIcon },
    { key: 'video', label: 'Video', icon: Video },
    { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  ];

  const currentIdx = steps.findIndex((s) => s.key === step);
  const isLastStep = step === 'done';

  const handleGenerateCaption = async () => {
    if (!topic.trim()) {
      toast.error('Enter a topic first');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/generate/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), platform, style: 'Casual' }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setContent((prev) => ({
        ...prev,
        caption: data.caption ?? '',
        hashtags: data.hashtags ?? '',
        imagePrompt: data.imagePrompt ?? '',
      }));
      setStep('caption');
      toast.success('Caption generated');
    } catch {
      toast.error('Failed to generate caption');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: content.caption || topic }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setContent((prev) => ({ ...prev, imageUrl: data.imageUrl ?? data.image ?? '' }));
      setStep('image');
      toast.success('Image generated');
    } catch {
      toast.error('Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate/video-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, caption: content.caption }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setContent((prev) => ({
        ...prev,
        videoPrompt: data.videoPrompt ?? '',
        videoStyle: data.style ?? '',
        videoDuration: data.duration ?? '',
        videoMusicVibe: data.musicVibe ?? '',
      }));
      setStep('video');
      toast.success('Video prompt generated');
    } catch {
      toast.error('Failed to generate video prompt');
    } finally {
      setGenerating(false);
    }
  };

  const handleSchedule = async () => {
    setScheduling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const brandId = '00000000-0000-0000-0000-000000000001';
      await createQueueItem({
        brand_id: brandId,
        platform,
        caption: content.caption?.slice(0, 2200) ?? null,
        hashtags: content.hashtags ?? null,
        image_prompt: content.imagePrompt || content.videoPrompt || null,
        asset_url: content.imageUrl || null,
        scheduled_time: new Date().toISOString(),
        status: 'draft',
      });
      setStep('done');
      toast.success('Added to queue');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule');
    } finally {
      setScheduling(false);
    }
  };

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRetry = async () => {
    setStep('topic');
    setTopic('');
    setContent({ caption: '', hashtags: '', imagePrompt: '', imageUrl: '', videoPrompt: '', videoStyle: '', videoDuration: '', videoMusicVibe: '' });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Creator
        </h1>
        <p className="text-muted-foreground">
          One click: Topic → Caption → Image → Video → Schedule
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = s.key === step;
          const isDone = steps.indexOf(s) < currentIdx || (step === 'done' && s.key === 'schedule');
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-xs font-medium ${
                  isDone
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                      ? 'border-2 border-primary text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className="h-px w-4 bg-border" />}
            </div>
          );
        })}
      </div>

      {/* Step: Topic Selection */}
      {step === 'topic' && (
        <Card>
          <CardHeader>
            <CardTitle>What do you want to create?</CardTitle>
            <CardDescription>Enter a topic and choose a platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Summer product launch, Behind the scenes, Customer testimonial"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateCaption()}
              />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={(v) => v && setPlatform(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateCaption} disabled={generating || !topic.trim()} className="w-full">
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {generating ? 'Generating...' : 'Generate Caption'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Caption */}
      {step === 'caption' && (
        <Card>
          <CardHeader>
            <CardTitle>Caption Generated</CardTitle>
            <CardDescription>Review and edit the caption, then generate an image.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea
                value={content.caption}
                onChange={(e) => setContent((prev) => ({ ...prev, caption: e.target.value }))}
                rows={4}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {content.caption.length} chars
                </span>
                <button
                  type="button"
                  onClick={() => copyText(content.caption, 'caption')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copied === 'caption' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {content.hashtags && (
              <div className="space-y-1">
                <Label>Hashtags</Label>
                <p className="text-sm text-primary">{content.hashtags}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleGenerateCaption} disabled={generating}>
                Regenerate
              </Button>
              <Button onClick={handleGenerateImage} disabled={generating} className="flex-1">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                {generating ? 'Generating...' : 'Generate Image'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Image */}
      {step === 'image' && (
        <Card>
          <CardHeader>
            <CardTitle>Image Generated</CardTitle>
            <CardDescription>Preview the image, then create a video prompt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.imageUrl && (
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={content.imageUrl}
                  alt="Generated"
                  className="w-full object-cover"
                />
              </div>
            )}
            {content.imagePrompt && (
              <div className="space-y-1">
                <Label>Image Prompt</Label>
                <p className="text-sm text-muted-foreground">{content.imagePrompt}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleGenerateImage} disabled={generating}>
                Regenerate
              </Button>
              <Button onClick={handleGenerateVideo} disabled={generating} className="flex-1">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                {generating ? 'Generating...' : 'Generate Video Prompt'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Video */}
      {step === 'video' && (
        <Card>
          <CardHeader>
            <CardTitle>Video Concept Ready</CardTitle>
            <CardDescription>Review the video prompt and schedule your post.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Video Prompt</Label>
              <Textarea value={content.videoPrompt} readOnly rows={4} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Style: {content.videoStyle || 'N/A'}</Badge>
              <Badge variant="outline">Duration: {content.videoDuration || 'N/A'}</Badge>
              <Badge variant="outline">Music: {content.videoMusicVibe || 'N/A'}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleGenerateVideo} disabled={generating}>
                Regenerate
              </Button>
              <Button onClick={handleSchedule} disabled={scheduling} className="flex-1">
                {scheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
                {scheduling ? 'Scheduling...' : 'Add to Queue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h2 className="mb-2 text-xl font-bold">Content Created!</h2>
            <p className="mb-6 text-muted-foreground">
              Your post has been added to the queue on {platform}.
            </p>
            <div className="space-y-2">
              <Button variant="outline" onClick={() => copyText(
                `Caption:\n${content.caption}\n\nHashtags:\n${content.hashtags}\n\nImage Prompt:\n${content.imagePrompt}\n\nVideo Prompt:\n${content.videoPrompt}`,
                'all',
              )}>
                {copied === 'all' ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy All
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry}>Create Another</Button>
                <Button onClick={() => window.location.href = '/dashboard/queue'}>
                  <Send className="mr-2 h-4 w-4" />
                  View Queue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
