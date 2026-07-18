'use client';

import {
  ImageIcon, VideoIcon, Sparkles, Copy, Check, RefreshCw,
  Send, Loader2, X, Upload, Clock, ListOrdered, SquarePen,
  ExternalLink, Images,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { PLATFORMS, getPlatform } from '@/lib/platforms';
import { supabase } from '@/lib/supabase';
import { generateSlideshowFromImages } from '@/lib/video-engine';
import { getAssets, uploadAsset } from '@/services/asset';
import { createQueueItem, getQueueItems } from '@/services/queue';
import { getSocialAccounts } from '@/services/social';
import {
  generateContent, generateImage, generateImagePrompt,
  generateScript, generateVideoPrompt,
} from '@/lib/ai-engine';
import type { Asset } from '@/types/asset';
import type { SocialAccount } from '@/types/social';
import type { PlatformState, QueueItem } from '@/types/queue';

const CONTENT_TYPES = ['Post', 'Story', 'Reel', 'Carousel', 'Video', 'Article', 'Thread'] as const;
const GOALS = ['Brand Awareness', 'Engagement', 'Sales / Conversions', 'Education', 'Entertainment', 'Community Building'] as const;

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-500/10 text-gray-500 border-gray-500/30' },
  pending_approval: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
  approved: { label: 'Approved', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
  scheduled: { label: 'Scheduled', color: 'bg-green-500/10 text-green-500 border-green-500/30' },
  published: { label: 'Published', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  partially_published: { label: 'Partially Published', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  queued: { label: 'Queued', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' },
  publishing: { label: 'Publishing', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  failed: { label: 'Failed', color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export default function NewPostPage() {
  const router = useRouter();
  const [tab, setTab] = useState('details');

  // Connected social accounts for workspace context
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);

  // Shared form state
  const [platform, setPlatform] = useState('');
  const [additionalPlatforms, setAdditionalPlatforms] = useState<string[]>([]);
  const selectedPlatforms = platform ? [platform, ...additionalPlatforms] : [];
  const [contentType, setContentType] = useState('');
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');

  // Content
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [title, setTitle] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');

  // Script
  const [scriptOutput, setScriptOutput] = useState<{
    hook: string; script: string; cta: string; estimatedDuration: string; sceneSuggestions: string[];
  } | null>(null);

  // Video Prompt
  const [videoPromptOutput, setVideoPromptOutput] = useState<{
    videoPrompt: string; style: string; duration: string; musicVibe: string;
  } | null>(null);

  // Video slideshow
  const [slideshowPrompt, setSlideshowPrompt] = useState('');
  const [slideshowImageCount, setSlideshowImageCount] = useState(3);
  const [generatingSlideshow, setGeneratingSlideshow] = useState(false);
  const [generatedVideoBlob, setGeneratedVideoBlob] = useState<Blob | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Generated image
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const assetsLoadedRef = useRef(false);

  // AI generating states
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);

  // Copied state
  const [copied, setCopied] = useState<string | null>(null);

  // Publish progress
  const [publishingProgress, setPublishingProgress] = useState<Array<{ platform: string; status: string }>>([]);
  const [showPublishProgress, setShowPublishProgress] = useState(false);

  // Schedule
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleHour, setScheduleHour] = useState('12');
  const [scheduleMinute, setScheduleMinute] = useState('00');
  const [scheduleAmPm, setScheduleAmPm] = useState<'AM' | 'PM'>('PM');
  const [scheduling, setScheduling] = useState(false);

  function buildScheduleISO(): string | null {
    if (!scheduleDate) return null;
    let h = parseInt(scheduleHour, 10);
    if (isNaN(h) || h < 1 || h > 12) h = 12;
    if (scheduleAmPm === 'PM' && h !== 12) h += 12;
    if (scheduleAmPm === 'AM' && h === 12) h = 0;
    const m = parseInt(scheduleMinute, 10);
    const date = new Date(scheduleDate);
    date.setHours(h, isNaN(m) ? 0 : m, 0, 0);
    return date.toISOString();
  }

  // Queue items
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);

  useEffect(() => {
    getSocialAccounts().then(setSocialAccounts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!assetsLoadedRef.current) {
      assetsLoadedRef.current = true;
      getAssets().then((allAssets) => {
        setAssets(allAssets);
        const params = new URLSearchParams(window.location.search);
        const assetId = params.get('assetId');
        if (assetId) {
          const match = allAssets.find((a) => a.id === assetId);
          if (match) setSelectedAsset(match);
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (selectedPlatforms.length > 0) {
      const strictest = Math.min(...selectedPlatforms.map(p => getPlatform(p)?.captionLimit ?? Infinity));
      if (caption.length > strictest) {
        toast.warning(`Caption exceeds the ${strictest.toLocaleString()} char limit of one or more selected platforms`);
      }
    }
  }, [caption, selectedPlatforms]);

  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const items = await getQueueItems();
      setQueueItems(items.slice(0, 10));
    } catch {
      // silent
    } finally {
      setQueueLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // --- AI Engine ---

  const handleGenerateContent = async () => {
    if (selectedPlatforms.length === 0 || !contentType || !topic.trim()) {
      toast.error('Please select at least one platform, Content Type, and Topic');
      return;
    }
    const primaryPlatform = selectedPlatforms[0];
    setGeneratingContent(true);
    try {
      const [contentData, scriptData, imgData] = await Promise.all([
        generateContent({
          platform: primaryPlatform, contentType, topic: topic.trim(),
          goal, contentSource: selectedAsset ? 'asset' : 'ai', assetUrl: selectedAsset?.url ?? null,
        }),
        generateScript({ platform: primaryPlatform, topic: topic.trim() }),
        generateImage({ topic: topic.trim(), platform: primaryPlatform }),
      ]);

      setCaption(contentData.caption || '');
      setHashtags(contentData.hashtags || '');
      setImagePrompt(contentData.imagePrompt || '');
      setTitle(contentData.title || '');
      if (imgData.imageUrl) setGeneratedImageUrl(imgData.imageUrl);
      setScriptOutput(scriptData);

      const videoData = await generateVideoPrompt({ topic: topic.trim(), caption: contentData.caption || '' });
      setVideoPromptOutput(videoData);

      toast.success('All content generated');
    } catch (err: unknown) {
      toast.error(`Generation failed\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleGenerateImage = async () => {
    const inputText = imagePrompt || topic;
    if (!inputText.trim()) {
      toast.error('Enter a topic or prompt first');
      return;
    }
    setGeneratingImage(true);
    try {
      const data = await generateImage({
        topic: inputText.trim(), platform: selectedPlatforms[0] || null,
      });
      setGeneratedImageUrl(data.imageUrl);
      toast.success('Image generated');
    } catch (err: unknown) {
      toast.error(`Failed to generate image\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!topic.trim()) {
      toast.error('Enter a topic first');
      return;
    }
    setGeneratingPrompt(true);
    try {
      const data = await generateImagePrompt({
        topic: topic.trim(), platform: selectedPlatforms[0] || null,
        caption: caption || null,
      });
      setImagePrompt(data.imagePrompt);
      toast.success('Image prompt generated');
    } catch (err: unknown) {
      toast.error(`Failed to generate prompt\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleGenerateScript = async () => {
    if (selectedPlatforms.length === 0 || !topic.trim()) {
      toast.error('Please select at least one platform and Topic');
      return;
    }
    setGeneratingScript(true);
    try {
      const data = await generateScript({ platform: selectedPlatforms[0], topic: topic.trim() });
      setScriptOutput(data);
      toast.success('Script generated');
    } catch (err: unknown) {
      toast.error(`Failed to generate script\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!topic.trim()) {
      toast.error('Enter a topic first');
      return;
    }
    setGeneratingVideo(true);
    try {
      const data = await generateVideoPrompt({ topic: topic.trim(), caption: caption || '' });
      setVideoPromptOutput(data);
      toast.success('Video prompt generated');
    } catch (err: unknown) {
      toast.error(`Failed to generate video prompt\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handleGenerateSlideshow = async () => {
    if (!slideshowPrompt.trim()) {
      toast.error('Enter a description for the video');
      return;
    }
    setGeneratingSlideshow(true);
    try {
      const imgRes = await fetch('/api/generate/slideshow-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: slideshowPrompt.trim(), count: slideshowImageCount }),
      });
      const imgData = await imgRes.json();
      if (!imgRes.ok) throw new Error(imgData.error || 'Failed to generate images');

      const blob = await generateSlideshowFromImages(imgData.images, 10);
      const url = URL.createObjectURL(blob);
      setGeneratedVideoUrl(url);
      setGeneratedVideoBlob(blob);
      toast.success('Video generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Video generation failed');
    } finally {
      setGeneratingSlideshow(false);
    }
  };

  const handleUseVideo = async () => {
    if (!generatedVideoBlob) return;
    try {
      const file = new File([generatedVideoBlob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });
      const asset = await uploadAsset(file, { name: 'AI Slideshow', tags: ['ai-video'] });
      setSelectedAsset(asset);
      setAssets((prev) => [asset, ...prev]);
      setGeneratedVideoUrl(null);
      setGeneratedVideoBlob(null);
      setSlideshowPrompt('');
      toast.success('Video saved and selected as asset');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to use video');
    }
  };

  const isVideoPlatform = selectedPlatforms.some(p => p === 'TikTok' || p === 'YouTube') || (selectedPlatforms.includes('Instagram') && (contentType === 'Reel' || contentType === 'Video'));

  // --- Upload ---
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadAsset } = await import('@/services/asset');
      const asset = await uploadAsset(file, { name: file.name });
      setSelectedAsset(asset);
      setAssets((prev) => [asset, ...prev]);
      toast.success('Asset uploaded');
    } catch (err: unknown) {
      toast.error(`Upload failed\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    e.target.value = '';
  };

  // --- Schedule ---
  const handleSchedule = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }
    const iso = buildScheduleISO();
    if (!iso) {
      toast.error('Select a date and time');
      return;
    }
    setScheduling(true);
    const platformsInit: Record<string, PlatformState> = {};
    for (const p of selectedPlatforms) {
      platformsInit[p] = { status: 'queued', retry_count: 0 };
    }
    try {
      await createQueueItem({
        platform: selectedPlatforms[0],
        platforms: platformsInit,
        caption: caption || null,
        hashtags: hashtags || null,
        image_prompt: imagePrompt || null,
        title: title || null,
        asset_url: generatedImageUrl || selectedAsset?.url || null,
        scheduled_time: iso,
        status: 'approved',
      });
      toast.success('Post scheduled for publishing');
      setScheduling(false);
      setTab('queue');
      loadQueue();
      resetForm();
      fetch('/api/automation/worker', { method: 'POST' }).catch(() => {});
    } catch (err: unknown) {
      toast.error(`Failed to schedule\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setScheduling(false);
    }
  };

  const handlePostNow = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }
    setScheduling(true);
    setPublishingProgress([]);
    setShowPublishProgress(true);
    try {
      const platformsInit: Record<string, PlatformState> = {};
      for (const p of selectedPlatforms) {
        platformsInit[p] = { status: 'queued', retry_count: 0 };
        setPublishingProgress(prev => [...prev, { platform: p, status: 'queued' }]);
      }

      const { data: item, error } = await supabase
        .from('queue_items')
        .insert({
          platform: selectedPlatforms[0],
          platforms: platformsInit,
          caption: caption || null,
          hashtags: hashtags || null,
          image_prompt: imagePrompt || null,
          title: title || null,
          asset_url: generatedImageUrl || selectedAsset?.url || null,
          scheduled_time: new Date().toISOString(),
          status: 'approved',
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error || !item) throw new Error(error?.message || 'Failed to create item');

      setPublishingProgress(prev => prev.map(p =>
        selectedPlatforms.includes(p.platform) ? { ...p, status: 'publishing' } : p
      ));

      // Publish in background via worker
      fetch('/api/automation/worker', { method: 'POST' }).catch(() => {});
      toast.success('Post queued for publishing');
      setTab('queue');
      loadQueue();
      resetForm();
    } catch (err: unknown) {
      toast.error(`Failed to queue post\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setPublishingProgress(prev => prev.map(p =>
        selectedPlatforms.includes(p.platform) ? { ...p, status: 'failed' } : p
      ));
    } finally {
      setScheduling(false);
    }
  };

  const resetForm = () => {
    setTopic('');
    setContentType('');
    setGoal('');
    setCaption('');
    setHashtags('');
    setTitle('');
    setImagePrompt('');
    setScriptOutput(null);
    setVideoPromptOutput(null);
    setGeneratedImageUrl(null);
    setSelectedAsset(null);
    setSlideshowPrompt('');
    setGeneratedVideoUrl(null);
    setGeneratedVideoBlob(null);
    setScheduleDate('');
  };

  const openScheduleNow = () => {
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1);
    setScheduleDate(defaultDate.toISOString().slice(0, 16));
    setTab('schedule');
  };

  const connectedPlatforms = socialAccounts.filter(a => a.status === 'connected').map(a => a.platform);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <SquarePen className="h-6 w-6 text-primary" />
          New Post
        </h1>
        <p className="text-muted-foreground">
          Create and schedule content in one unified workflow.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1">Content Details</TabsTrigger>
          <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">AI Content Engine</TabsTrigger>
          <TabsTrigger value="schedule" className="flex-1">Schedule</TabsTrigger>
          <TabsTrigger value="queue" className="flex-1">Queue</TabsTrigger>
        </TabsList>

        {/* Tab: Content Details */}
        <TabsContent value="details" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Details</CardTitle>
              <CardDescription>Configure your post details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={platform} onValueChange={(v) => { setPlatform(v ?? ''); setAdditionalPlatforms([]); }}>
                    <SelectTrigger id="platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}
                          {connectedPlatforms.includes(p.name as any) && ' ✓'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getPlatform(platform) && (
                    <p className="text-xs text-muted-foreground">{getPlatform(platform)?.description}</p>
                  )}
                </div>

                {platform && (
                  <div className="space-y-2">
                    <Label>Also publish to (optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.filter(p => p.name !== platform).map((p) => {
                        const isConnected = connectedPlatforms.includes(p.name as any);
                        const isSelected = additionalPlatforms.includes(p.name);
                        return (
                          <label
                            key={p.name}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'hover:border-muted-foreground/30'
                            } ${!isConnected ? 'opacity-40' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isConnected}
                              onChange={() => {
                                setAdditionalPlatforms(prev =>
                                  prev.includes(p.name)
                                    ? prev.filter(x => x !== p.name)
                                    : [...prev, p.name]
                                );
                              }}
                              className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            {p.name}
                            {!isConnected && (
                              <span className="text-[9px] text-muted-foreground">not connected</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {additionalPlatforms.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Publishing to: {selectedPlatforms.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type</Label>
                  <Select value={contentType} onValueChange={(v) => setContentType(v ?? '')}>
                    <SelectTrigger id="contentType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="goal">Goal (optional)</Label>
                  <Select value={goal} onValueChange={(v) => setGoal(v ?? '')}>
                    <SelectTrigger id="goal">
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOALS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Behind the scenes, Product launch, Customer testimonial"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="caption">Caption</Label>
                  {selectedPlatforms.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {caption.length.toLocaleString()} / {Math.min(...selectedPlatforms.map(p => getPlatform(p)?.captionLimit ?? Infinity)).toLocaleString()} chars
                    </span>
                  )}
                </div>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write or generate your caption..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hashtags">Hashtags</Label>
                <Input
                  id="hashtags"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#your #hashtags #here"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title for your content"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setTab('media')}>
                  Next: Media
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Media */}
        <TabsContent value="media" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upload Asset</CardTitle>
                <CardDescription>Upload an image or video from your device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/50">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Click to upload</span>
                  <span className="text-xs text-muted-foreground">Images or videos up to 50MB</span>
                  <Input id="file-upload" type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
                </Label>
                {selectedAsset && (
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    {selectedAsset.type === 'image' ? (
                      <img src={selectedAsset.url} alt={selectedAsset.name} className="h-14 w-14 rounded object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded bg-muted">
                        <VideoIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{selectedAsset.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{selectedAsset.type}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedAsset(null)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Image</CardTitle>
                <CardDescription>Generate an image with AI from your topic or prompt.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedImageUrl ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-lg border">
                      <img src={generatedImageUrl} alt="Generated" className="w-full object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setGeneratedImageUrl(null)}>
                        <X className="mr-1 h-3 w-3" /> Clear
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleGenerateImage} disabled={generatingImage}>
                        <RefreshCw className="mr-1 h-3 w-3" /> Regenerate
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => {
                    if (!topic.trim()) { setTab('details'); toast.info('Enter a topic first in Content Details'); return; }
                    handleGenerateImage();
                  }} disabled={generatingImage} className="w-full">
                    {generatingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {generatingImage ? 'Generating...' : 'Generate Image'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {isVideoPlatform && (
            <Card>
              <CardHeader>
                <CardTitle>AI Video (Slideshow)</CardTitle>
                <CardDescription>Generate a free slideshow video from a text description. Images via Pollinations + FFmpeg.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Describe the scenes</Label>
                  <Textarea
                    value={slideshowPrompt}
                    onChange={(e) => setSlideshowPrompt(e.target.value)}
                    placeholder="e.g. A cinematic sunrise over snowy mountains, tropical beach at golden hour, starry night sky"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Images: {slideshowImageCount}</Label>
                  <Input
                    type="range" min={2} max={5}
                    value={slideshowImageCount}
                    onChange={(e) => setSlideshowImageCount(Number(e.target.value))}
                    className="h-2"
                  />
                </div>
                {generatedVideoUrl ? (
                  <div className="space-y-3">
                    <video src={generatedVideoUrl} controls className="w-full rounded-lg" style={{ aspectRatio: '9/16', maxHeight: 400 }} />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setGeneratedVideoUrl(null); setGeneratedVideoBlob(null); }}>
                        <X className="mr-1 h-3 w-3" /> Clear
                      </Button>
                      <Button size="sm" onClick={handleUseVideo}>
                        <Check className="mr-1 h-3 w-3" /> Use as Asset
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleGenerateSlideshow} disabled={generatingSlideshow || !slideshowPrompt.trim()} className="w-full">
                    {generatingSlideshow ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Images className="mr-2 h-4 w-4" />}
                    {generatingSlideshow ? 'Generating...' : 'Generate Slideshow Video'}
                  </Button>
                )}
                <div className="text-center">
                  <Button variant="link" size="sm" onClick={() => router.push('/dashboard/video-engine')}>
                    <ExternalLink className="mr-1 h-3 w-3" /> Full Video Engine
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Browse existing assets */}
          {assets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Existing Assets</CardTitle>
                <CardDescription>Select a previously uploaded asset.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid max-h-48 grid-cols-4 gap-3 overflow-y-auto sm:grid-cols-6 md:grid-cols-8">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
                      className={`group relative overflow-hidden rounded-lg border text-left ${
                        selectedAsset?.id === asset.id ? 'border-primary ring-2 ring-primary' : 'hover:border-primary'
                      }`}
                    >
                      {asset.type === 'image' ? (
                        <div className="aspect-square">
                          <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="relative flex aspect-square items-center justify-center bg-black/10">
                          <video src={asset.url} className="h-full w-full object-cover" preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50">
                              <VideoIcon className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setTab('details')}>Back</Button>
            <Button onClick={() => setTab('ai')}>Next: AI Content Engine</Button>
          </div>
        </TabsContent>

        {/* Tab: AI Content Engine */}
        <TabsContent value="ai" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Content</CardTitle>
              <CardDescription>Generates caption, hashtags, title, image, video script, and video prompt from your topic in one click.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleGenerateContent} disabled={generatingContent} className="w-full">
                {generatingContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {generatingContent ? 'Generating...' : 'Generate All Content'}
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">Caption</CardTitle>
                </div>
                {caption && (
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(caption, 'caption')}>
                    {copied === 'caption' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {caption ? (
                  <p className="whitespace-pre-wrap text-sm">{caption}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Generate content to see caption.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">Hashtags</CardTitle>
                </div>
                {hashtags && (
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(hashtags, 'hashtags')}>
                    {copied === 'hashtags' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {hashtags ? (
                  <p className="text-sm">{hashtags}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Hashtags will appear here.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">Image Prompt</CardTitle>
                </div>
                {imagePrompt && (
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(imagePrompt, 'prompt')}>
                    {copied === 'prompt' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {imagePrompt ? (
                  <p className="whitespace-pre-wrap text-sm">{imagePrompt}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No prompt yet.</p>
                )}
                <Button variant="outline" size="sm" onClick={handleGeneratePrompt} disabled={generatingPrompt} className="w-full">
                  {generatingPrompt ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                  Generate Prompt
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Video Script</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scriptOutput ? (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Hook</p>
                      <p className="text-sm">{scriptOutput.hook}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Duration</p>
                      <p className="text-sm">{scriptOutput.estimatedDuration}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => copyToClipboard(
                      `HOOK: ${scriptOutput.hook}\n\nSCRIPT:\n${scriptOutput.script}\n\nCTA: ${scriptOutput.cta}\n\nDuration: ${scriptOutput.estimatedDuration}\n\nScenes:\n${scriptOutput.sceneSuggestions.map((s, i) => `${i+1}. ${s}`).join('\n')}`, 'script')}>
                      {copied === 'script' ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />} Copy Full Script
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No script yet.</p>
                )}
                <Button variant="outline" size="sm" onClick={handleGenerateScript} disabled={generatingScript} className="w-full">
                  {generatingScript ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                  {generatingScript ? 'Generating...' : 'Generate Script'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Video Prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {videoPromptOutput ? (
                  <div className="space-y-1">
                    <p className="text-sm">{videoPromptOutput.videoPrompt}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">Style: {videoPromptOutput.style}</Badge>
                      <Badge variant="outline" className="text-xs">Duration: {videoPromptOutput.duration}</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No video prompt yet.</p>
                )}
                <Button variant="outline" size="sm" onClick={handleGenerateVideo} disabled={generatingVideo} className="w-full">
                  {generatingVideo ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                  {generatingVideo ? 'Generating...' : 'Generate Video Prompt'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setTab('media')}>Back</Button>
            <Button onClick={openScheduleNow}>
              Next: Schedule
            </Button>
          </div>
        </TabsContent>

        {/* Tab: Schedule */}
        <TabsContent value="schedule" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Post</CardTitle>
              <CardDescription>Review your content and choose when to publish.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="mb-3 text-sm font-semibold">Post Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="col-span-2"><span className="text-muted-foreground">Platforms:</span> {selectedPlatforms.length > 0 ? selectedPlatforms.join(', ') : 'Not set'}</div>
                  <div><span className="text-muted-foreground">Content Type:</span> {contentType || 'Not set'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Topic:</span> {topic || 'Not set'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Caption:</span> {caption ? `${caption.slice(0, 100)}...` : 'Not set'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Asset:</span> {generatedImageUrl ? 'AI Image ✓' : selectedAsset ? `${selectedAsset.name} ✓` : 'None'}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handlePostNow} disabled={selectedPlatforms.length === 0 || scheduling} className="flex-1">
                  {scheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Post Now
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or schedule for later</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date & Time</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-auto"
                  />
                  <select
                    value={scheduleHour}
                    onChange={(e) => setScheduleHour(e.target.value)}
                    className="flex h-9 w-16 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={String(h).padStart(2, '0')}>{h}</option>
                    ))}
                  </select>
                  <span className="flex items-center text-sm text-muted-foreground">:</span>
                  <select
                    value={scheduleMinute}
                    onChange={(e) => setScheduleMinute(e.target.value)}
                    className="flex h-9 w-16 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select
                    value={scheduleAmPm}
                    onChange={(e) => setScheduleAmPm(e.target.value as 'AM' | 'PM')}
                    className="flex h-9 w-16 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setTab('ai')}>Back</Button>
                <Button onClick={handleSchedule} disabled={selectedPlatforms.length === 0 || !scheduleDate || scheduling}>
                  {scheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {scheduling ? 'Adding to Queue...' : 'Schedule'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Queue */}
        <TabsContent value="queue" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Queue Items</CardTitle>
                <CardDescription>Your recently created and scheduled posts.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setTab('details'); resetForm(); }}>
                <SquarePen className="mr-1 h-4 w-4" /> New Post
              </Button>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
              ) : queueItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <ListOrdered className="h-8 w-8" />
                  <p className="text-sm">No queue items yet. Create your first post!</p>
                  <Button variant="outline" size="sm" onClick={() => setTab('details')}>
                    <SquarePen className="mr-1 h-4 w-4" /> Create Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {queueItems.map((item) => {
                    const st = STATUS_DISPLAY[item.status] || STATUS_DISPLAY.draft;
                    const platformStates = (item as any).platforms || {};
                    const hasPlatforms = Object.keys(platformStates).length > 0;
                    return (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {item.caption?.slice(0, 60) || 'No caption'}
                            </p>
                            <Badge variant="outline" className={`text-xs ${st.color}`}>{st.label}</Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            {hasPlatforms ? (
                              <div className="flex gap-2 flex-wrap">
                                {Object.entries(platformStates).map(([pl, ps]: [string, any]) => (
                                  <span key={pl} className={`${
                                    ps.status === 'published' ? 'text-emerald-400' :
                                    ps.status === 'failed' ? 'text-red-400' :
                                    ps.status === 'publishing' ? 'text-purple-400' :
                                    'text-slate-400'
                                  }`}>
                                    {pl}: {ps.status}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span>{item.platform}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(item.scheduled_time).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="link" size="sm" className="w-full" onClick={() => window.location.href = '/dashboard/queue'}>
                    View Full Queue
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Publish Progress Dialog */}
      <Dialog open={showPublishProgress} onOpenChange={(o) => !o && setShowPublishProgress(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Publishing...</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {publishingProgress.map((p) => (
              <div key={p.platform} className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.platform}</span>
                <span className={`text-sm ${
                  p.status === 'published' ? 'text-emerald-400' :
                  p.status === 'failed' ? 'text-red-400' :
                  p.status === 'publishing' ? 'text-purple-400' :
                  'text-slate-400'
                }`}>
                  {p.status === 'published' && '✅'}
                  {p.status === 'failed' && '❌'}
                  {p.status === 'publishing' && 'Publishing...'}
                  {p.status === 'queued' && 'Queued'}
                  {p.status === 'pending' && 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
