'use client';

import {
  Sparkles, Copy, Check, RefreshCw, CalendarClock, ImageDown, Pencil,
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
import { Textarea } from '@/components/ui/textarea';
import { PLATFORMS } from '@/lib/platforms';
import { supabase } from '@/lib/supabase';
import { getBrands } from '@/services/brand';
import { createQueueItem } from '@/services/queue';
import { createImagePrompt, updateImagePrompt } from '@/services/image-prompt';
import type { Brand } from '@/types/brand';

interface PromptOutput {
  imagePrompt: string;
  style: string;
  lighting: string;
  camera: string;
  composition: string;
}

export default function ImagePromptPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [platform, setPlatform] = useState('');
  const [topic, setTopic] = useState('');
  const [caption, setCaption] = useState('');
  const [script, setScript] = useState('');
  const brandsLoadedRef = useRef(false);

  const [output, setOutput] = useState<PromptOutput | null>(null);
  const [draft, setDraft] = useState<PromptOutput | null>(null);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const selectedPlatform = useMemo(
    () => PLATFORMS.find((p) => p.name === platform),
    [platform],
  );

  useEffect(() => {
    if (brandsLoadedRef.current) return;
    brandsLoadedRef.current = true;
    getBrands().then(setBrands).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setGenerating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/generate/image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand || null,
          platform: platform || null,
          topic: topic.trim(),
          caption: caption.trim() || null,
          script: script.trim() || null,
          supabaseToken: session.access_token,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setOutput(data);
      setDraft(data);
      setEditing(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate prompt');
    } finally {
      setGenerating(false);
    }
  };

  const toggleEdit = () => {
    if (!editing && output) {
      setDraft({ ...output });
    }
    setEditing(!editing);
  };

  const updateSubField = (field: keyof PromptOutput, value: string) => {
    if (!draft) return;
    const updated = { ...draft, [field]: value };
    if (field !== 'imagePrompt') {
      const subject = updated.imagePrompt.split(/\. Style:/i)[0];
      const parts = [subject];
      if (updated.style) parts.push(`Style: ${updated.style}`);
      if (updated.lighting) parts.push(`Lighting: ${updated.lighting}`);
      if (updated.camera) parts.push(`Camera: ${updated.camera}`);
      if (updated.composition) parts.push(`Composition: ${updated.composition}`);
      updated.imagePrompt = parts.join('. ');
    }
    setDraft(updated);
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    if (!output) return;

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
        caption: caption.trim() || 'Image generated',
        hashtags: null,
        image_prompt: output.imagePrompt,
        title: null,
        asset_url: null,
        scheduled_time: new Date(scheduleDate).toISOString(),
        status: 'draft',
      });

      await createImagePrompt({
        brand_id: selectedBrand || null,
        platform: platform || null,
        topic: topic.trim(),
        caption: caption.trim() || null,
        script: script.trim() || null,
        image_prompt: output.imagePrompt,
        style: output.style,
        lighting: output.lighting,
        camera: output.camera,
        composition: output.composition,
      }).then((saved) => {
        if (saved.id) {
          updateImagePrompt(saved.id, { queue_item_id: queueItem.id });
        }
      });

      toast.success('Image prompt saved to queue');
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

  const canGenerate = topic.trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Image Prompt Generator</h1>
        <p className="text-muted-foreground">
          Create detailed AI image prompts from your content.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Content Details</CardTitle>
              <CardDescription>Describe what you want to visualize.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic *</Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What should the image be about?"
                  rows={2}
                />
              </div>

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
                {selectedPlatform && (
                  <p className="text-xs text-muted-foreground">{selectedPlatform.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption">Generated Caption (optional)</Label>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Paste your generated caption..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="script">Video Script (optional)</Label>
                <Textarea
                  id="script"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Paste your video script..."
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {generating ? 'Generating...' : 'Generate Prompt'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {!output ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Image Prompt</CardTitle>
                <CardDescription>Fill in the details and generate to see your prompt here.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <ImageDown className="h-12 w-12" />
                  <p className="text-sm">No prompt generated yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Image Prompt</CardTitle>
                    <CardDescription>Ready for Flux, Imagen, Midjourney, SDXL, GPT Image.</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={toggleEdit}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard((draft ?? output).imagePrompt, 'prompt')}
                    >
                      {copied === 'prompt' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {editing && draft ? (
                    <Textarea
                      value={draft.imagePrompt}
                      onChange={(e) => setDraft({ ...draft, imagePrompt: e.target.value })}
                      rows={4}
                      className="text-sm"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{output.imagePrompt}</p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Style</CardTitle>
                  </CardHeader>
                  <CardContent>
                  {editing && draft ? (
                    <Textarea
                      value={draft.style}
                      onChange={(e) => updateSubField('style', e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm">{output.style}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Camera</CardTitle>
                </CardHeader>
                <CardContent>
                  {editing && draft ? (
                    <Textarea
                      value={draft.camera}
                      onChange={(e) => updateSubField('camera', e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm">{output.camera}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Lighting</CardTitle>
                </CardHeader>
                <CardContent>
                  {editing && draft ? (
                    <Textarea
                      value={draft.lighting}
                      onChange={(e) => updateSubField('lighting', e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm">{output.lighting}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Composition</CardTitle>
                </CardHeader>
                <CardContent>
                  {editing && draft ? (
                    <Textarea
                      value={draft.composition}
                      onChange={(e) => updateSubField('composition', e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm">{output.composition}</p>
                  )}
                </CardContent>
              </Card>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => copyToClipboard((draft ?? output).imagePrompt, 'full')}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Prompt
                </Button>
                {editing ? (
                  <Button onClick={() => { setOutput(draft); setEditing(false); toast.success('Prompt updated'); }}>
                    <Check className="mr-2 h-4 w-4" />
                    Done Editing
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button onClick={openSchedule}>
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Image Prompt</DialogTitle>
            <DialogDescription>Schedule this image prompt for posting.</DialogDescription>
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
