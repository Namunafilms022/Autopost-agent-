'use client';

import {
  Sparkles, Copy, Check, RefreshCw, CalendarClock, ImageIcon, VideoIcon, X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLATFORMS as PLATFORM_CONFIGS, getPlatform } from '@/lib/platforms';
import { supabase } from '@/lib/supabase';
import { getAssets } from '@/services/asset';
import { getBrands } from '@/services/brand';
import { createQueueItem } from '@/services/queue';
import type { Asset } from '@/types/asset';
import type { Brand } from '@/types/brand';

const CONTENT_TYPES = [
  'Post',
  'Story',
  'Reel',
  'Carousel',
  'Video',
  'Article',
  'Thread',
] as const;

const GOALS = [
  'Brand Awareness',
  'Engagement',
  'Sales / Conversions',
  'Education',
  'Entertainment',
  'Community Building',
] as const;

type ContentSource = 'ai' | 'asset';

export default function GeneratePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [platform, setPlatform] = useState('');
  const [contentType, setContentType] = useState('');
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');

  const [contentSource, setContentSource] = useState<ContentSource>('ai');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const assetsLoadedRef = useRef(false);

  const [outputCaption, setOutputCaption] = useState('');
  const [outputHashtags, setOutputHashtags] = useState('');
  const [outputImagePrompt, setOutputImagePrompt] = useState('');
  const [outputTitle, setOutputTitle] = useState('');

  const [copied, setCopied] = useState<'caption' | 'hashtags' | 'title' | null>(null);
  const [generating, setGenerating] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const selectedPlatform = useMemo(() => getPlatform(platform), [platform]);

  useEffect(() => {
    getBrands().then(setBrands).catch(() => {});
  }, []);

  useEffect(() => {
    if (contentSource === 'asset' && !assetsLoadedRef.current) {
      assetsLoadedRef.current = true;
      getAssets().then(setAssets).catch(() => {});
    }
  }, [contentSource]);

  const handleGenerate = async () => {
    if (!selectedBrand || !platform || !contentType || !topic.trim()) {
      toast.error('Please fill in Brand, Platform, Content Type, and Topic');
      return;
    }

    if (contentSource === 'asset' && !selectedAsset) {
      toast.error('Please select an asset');
      return;
    }

    setGenerating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand,
          platform,
          contentType,
          topic: topic.trim(),
          goal,
          contentSource,
          assetUrl: selectedAsset?.url ?? null,
          supabaseToken: session.access_token,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setOutputCaption(data.caption);
      setOutputHashtags(data.hashtags);

      if (contentSource === 'asset') {
        setOutputTitle(data.title ?? '');
        setOutputImagePrompt('');
      } else {
        setOutputImagePrompt(data.imagePrompt);
        setOutputTitle('');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'caption' | 'hashtags' | 'title') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSchedule = async () => {
    if (!scheduleDate) {
      toast.error('Please select a date and time');
      return;
    }

    setScheduling(true);
    try {
      await createQueueItem({
        brand_id: selectedBrand,
        platform,
        caption: outputCaption,
        hashtags: outputHashtags,
        image_prompt: outputImagePrompt || null,
        title: outputTitle || null,
        asset_url: selectedAsset?.url ?? null,
        scheduled_time: new Date(scheduleDate).toISOString(),
        status: 'draft',
      });
      toast.success('Content scheduled');
      setScheduleOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule');
    } finally {
      setScheduling(false);
    }
  };

  const openSchedule = () => {
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1);
    setScheduleDate(defaultDate.toISOString().slice(0, 16));
    setScheduleOpen(true);
  };

  const canGenerate = selectedBrand && platform && contentType && topic.trim() && (contentSource === 'ai' || selectedAsset);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate</h1>
        <p className="text-muted-foreground">Create AI-powered content for your brands.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Inputs */}
        <div className="space-y-6 xl:col-span-2">
          {/* Content Source */}
          <Card>
            <CardHeader>
              <CardTitle>Content Source</CardTitle>
              <CardDescription>Choose how to generate your content.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setContentSource('ai');
                    setSelectedAsset(null);
                  }}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    contentSource === 'ai'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Sparkles className="mx-auto mb-1 h-5 w-5" />
                  AI Generated
                </button>
                <button
                  type="button"
                  onClick={() => setContentSource('asset')}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    contentSource === 'asset'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <ImageIcon className="mx-auto mb-1 h-5 w-5" />
                  Uploaded Asset
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Details</CardTitle>
              <CardDescription>Tell us what you need created.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Select Brand */}
              <div className="space-y-2">
                <Label htmlFor="brand">Select Brand</Label>
                <Select value={selectedBrand} onValueChange={(v) => setSelectedBrand(v ?? '')}>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Choose a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.brand_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v ?? '')}>
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_CONFIGS.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPlatform && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPlatform.description} — {selectedPlatform.captionLimit.toLocaleString()} char limit, {selectedPlatform.hashtagLimit} hashtags max.
                  </p>
                )}
              </div>

              {/* Content Type */}
              <div className="space-y-2">
                <Label htmlFor="contentType">Content Type</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v ?? '')}>
                  <SelectTrigger id="contentType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Behind the scenes, Product launch, Customer testimonial"
                />
              </div>

              {/* Goal */}
              <div className="space-y-2">
                <Label htmlFor="goal">Goal (optional)</Label>
                <Select value={goal} onValueChange={(v) => setGoal(v ?? '')}>
                  <SelectTrigger id="goal">
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Asset Picker */}
              {contentSource === 'asset' && (
                <div className="space-y-2">
                  <Label>Selected Asset</Label>
                  {selectedAsset ? (
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      {selectedAsset.type === 'image' ? (
                        <img
                          src={selectedAsset.url}
                          alt={selectedAsset.name}
                          className="h-14 w-14 rounded object-cover"
                        />
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
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { assetsLoadedRef.current = false; getAssets().then(setAssets).catch(() => {}); setAssetPickerOpen(true); }}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Browse Assets
                    </Button>
                  )}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {generating ? 'Generating...' : 'Generate Content'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Outputs */}
        <div className="space-y-6 xl:col-span-3">
          {/* Caption */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Caption</CardTitle>
                <CardDescription>AI-generated caption for your content.</CardDescription>
              </div>
              {outputCaption && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(outputCaption, 'caption')}
                >
                  {copied === 'caption' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {outputCaption ? (
                <>
                  <p className="whitespace-pre-wrap text-sm">{outputCaption}</p>
                  {selectedPlatform && (
                    <p className={`text-xs ${outputCaption.length > selectedPlatform.captionLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {outputCaption.length.toLocaleString()} / {selectedPlatform.captionLimit.toLocaleString()} characters
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Fill in the details and generate content to see the caption here.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Hashtags</CardTitle>
                <CardDescription>Recommended hashtags for better reach.</CardDescription>
              </div>
              {outputHashtags && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(outputHashtags, 'hashtags')}
                >
                  {copied === 'hashtags' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {outputHashtags ? (
                <>
                  <p className="text-sm">{outputHashtags}</p>
                  {selectedPlatform && (
                    <p className={`text-xs ${outputHashtags.split(' ').filter((h) => h.startsWith('#')).length > selectedPlatform.hashtagLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {outputHashtags.split(' ').filter((h) => h.startsWith('#')).length} / {selectedPlatform.hashtagLimit} hashtags
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Hashtags will appear here after generation.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Title (asset mode) or Image Prompt (AI mode) */}
          {contentSource === 'asset' ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Title</CardTitle>
                  <CardDescription>AI-generated title for your content.</CardDescription>
                </div>
                {outputTitle && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(outputTitle, 'title')}
                  >
                    {copied === 'title' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {outputTitle ? (
                  <p className="text-sm">{outputTitle}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    A title will appear here after generation.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Image Prompt</CardTitle>
                  <CardDescription>Prompt for generating an accompanying image.</CardDescription>
                </div>
                {outputImagePrompt && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(outputImagePrompt, 'caption')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {outputImagePrompt ? (
                  <p className="text-sm">{outputImagePrompt}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    An image generation prompt will appear here.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Regenerate + Schedule */}
          {outputCaption && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button onClick={openSchedule}>
                <CalendarClock className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Asset Picker Dialog */}
      <Dialog open={assetPickerOpen} onOpenChange={setAssetPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select an Asset</DialogTitle>
            <DialogDescription>Choose an image or video to accompany your content.</DialogDescription>
          </DialogHeader>
          {assets.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No assets found. Upload some in the Asset Library first.
            </p>
          ) : (
            <div className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    setSelectedAsset(asset);
                    setAssetPickerOpen(false);
                  }}
                  className="group relative overflow-hidden rounded-lg border text-left hover:border-primary"
                >
                  {asset.type === 'image' ? (
                    <div className="aspect-square">
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="relative flex aspect-square items-center justify-center bg-black/10">
                      <video
                        src={asset.url}
                        className="h-full w-full object-cover"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
                          <VideoIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="truncate p-1.5 text-xs">{asset.name}</p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Content</DialogTitle>
            <DialogDescription>Choose when this content should be posted.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scheduleTime">Date & Time</Label>
            <Input
              id="scheduleTime"
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={scheduling}>
              {scheduling ? 'Scheduling...' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
