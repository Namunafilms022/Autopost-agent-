'use client';

import {
  Sparkles, RefreshCw, Download, CalendarClock, Image as ImageIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PLATFORMS } from '@/lib/platforms';
import { supabase } from '@/lib/supabase';
import { getBrands } from '@/services/brand';
import { createQueueItem } from '@/services/queue';
import { createGeneratedImage, updateGeneratedImage } from '@/services/generated-image';
import type { Brand } from '@/types/brand';

export default function ImageEnginePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [platform, setPlatform] = useState('');
  const [topic, setTopic] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const brandsLoadedRef = useRef(false);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (brandsLoadedRef.current) return;
    brandsLoadedRef.current = true;
    getBrands().then(setBrands).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    const inputText = useCustomPrompt ? customPrompt : topic;
    if (!inputText.trim()) {
      toast.error(useCustomPrompt ? 'Please enter a prompt' : 'Please enter a topic');
      return;
    }

    setGenerating(true);
    setImageUrl(null);
    setGenerationStatus(useCustomPrompt ? 'Creating image...' : 'Generating prompt...');
    setSavedId(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      if (!useCustomPrompt) {
        setGenerationStatus('Creating image...');
      }

      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand || null,
          platform: platform || null,
          topic: inputText.trim(),
          customPrompt: useCustomPrompt || null,
          supabaseToken: session.access_token,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setImageUrl(data.imageUrl);
      setGenerationStatus(`Generated in ${(data.generationTime / 1000).toFixed(1)}s via ${data.provider}`);
    } catch (err: unknown) {
      setGenerationStatus('');
      toast.error(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  const handleSave = async () => {
    if (!imageUrl) return;
    if (!selectedBrand) {
      toast.error('Please select a brand to save');
      return;
    }
    if (!scheduleDate) {
      toast.error('Please select a date and time');
      return;
    }

    setScheduling(true);
    try {
      const queueItem = await createQueueItem({
        brand_id: selectedBrand,
        platform: platform || 'Instagram',
        caption: topic.trim(),
        hashtags: null,
        image_prompt: null,
        title: null,
        asset_url: imageUrl,
        scheduled_time: new Date(scheduleDate).toISOString(),
        status: 'draft',
      });

      const saved = await createGeneratedImage({
        brand_id: selectedBrand || null,
        platform: platform || null,
        topic: topic.trim(),
        prompt: 'internal',
        image_url: imageUrl,
        generation_time: 0,
      });

      setSavedId(saved.id);

      if (saved.id) {
        await updateGeneratedImage(saved.id, { queue_item_id: queueItem.id });
      }

      toast.success('Image saved to queue');
      setScheduleOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
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

  const canGenerate = useCustomPrompt ? customPrompt.trim() : topic.trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Image Engine</h1>
        <p className="text-muted-foreground">
          Generate AI images. Use a topic (AI writes the prompt) or write your own prompt.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>Describe what to visualize.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="customPrompt"
                  checked={useCustomPrompt}
                  onCheckedChange={setUseCustomPrompt}
                />
                <Label htmlFor="customPrompt" className="text-sm">Write my own prompt</Label>
              </div>

              {useCustomPrompt ? (
                <div className="space-y-2">
                  <Label htmlFor="customPromptText">Prompt *</Label>
                  <Textarea
                    id="customPromptText"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g., A serene mountain lake at sunrise with mist"
                    rows={3}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <Textarea
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="What should the image show?"
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="brand">Brand (optional)</Label>
                <Select value={selectedBrand} onValueChange={(v) => setSelectedBrand(v ?? '')}>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.brand_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform (optional)</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v ?? '')}>
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {generating ? 'Generating...' : 'Generate Image'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Generated Image</CardTitle>
              <CardDescription>
                {generationStatus || 'Enter content and generate to see the image.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generating ? (
                <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                  <p className="text-sm">{generationStatus}</p>
                </div>
              ) : imageUrl ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-lg border bg-muted">
                    <img
                      src={imageUrl}
                      alt="Generated"
                      className="h-auto w-full object-cover"
                    />
                  </div>

                  {generationStatus && (
                    <p className="text-center text-xs text-muted-foreground">{generationStatus}</p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button variant="outline" onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button onClick={openSchedule}>
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Queue
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <ImageIcon className="h-12 w-12" />
                  <p className="text-sm">No image generated yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Queue Image</DialogTitle>
            <DialogDescription>Schedule this image for posting.</DialogDescription>
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
            <Button onClick={handleSave} disabled={scheduling}>
              {scheduling ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
