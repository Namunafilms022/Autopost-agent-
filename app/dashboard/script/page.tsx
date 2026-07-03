'use client';

import {
  Sparkles, Copy, Check, RefreshCw, CalendarClock, Clock, Clapperboard,
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
import { createScript, updateScript } from '@/services/script';
import type { Brand } from '@/types/brand';

interface ScriptOutput {
  hook: string;
  script: string;
  cta: string;
  estimatedDuration: string;
  sceneSuggestions: string[];
}

export default function ScriptPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [platform, setPlatform] = useState('');
  const [topic, setTopic] = useState('');
  const brandsLoadedRef = useRef(false);

  const [output, setOutput] = useState<ScriptOutput | null>(null);
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
    if (!platform || !topic.trim()) {
      toast.error('Please fill in Platform and Topic');
      return;
    }

    setGenerating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/generate/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand || null,
          platform,
          topic: topic.trim(),
          supabaseToken: session.access_token,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setOutput(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate script');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyFullScript = async () => {
    if (!output) return;
    const full = `HOOK:\n${output.hook}\n\nSCRIPT:\n${output.script}\n\nCTA:\n${output.cta}\n\nDuration: ${output.estimatedDuration}\n\nScenes:\n${output.sceneSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    await navigator.clipboard.writeText(full);
    toast.success('Full script copied');
  };

  const handleSaveToQueue = async () => {
    if (!output) return;
    if (!scheduleDate) {
      toast.error('Please select a date and time');
      return;
    }

    setScheduling(true);
    try {
      const scriptContent = `HOOK: ${output.hook}\n\nSCRIPT:\n${output.script}\n\nCTA: ${output.cta}\n\nDuration: ${output.estimatedDuration}\n\nScenes:\n${output.sceneSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

      if (!selectedBrand) {
        toast.error('Please select a brand to save to queue');
        setScheduling(false);
        return;
      }

      const queueItem = await createQueueItem({
        brand_id: selectedBrand,
        platform,
        caption: scriptContent,
        hashtags: null,
        image_prompt: null,
        title: null,
        asset_url: null,
        scheduled_time: new Date(scheduleDate).toISOString(),
        status: 'draft',
      });

      const saved = await createScript({
        brand_id: selectedBrand || null,
        platform,
        topic: topic.trim(),
        hook: output.hook,
        script: output.script,
        cta: output.cta,
        estimated_duration: output.estimatedDuration,
        scene_suggestions: output.sceneSuggestions,
      });

      if (saved.id) {
        await updateScript(saved.id, { queue_item_id: queueItem.id });
      }

      toast.success('Script saved to queue');
      setScheduleOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save to queue');
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

  const canGenerate = platform && topic.trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Script Generator</h1>
        <p className="text-muted-foreground">Generate social media video scripts with AI.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Script Details</CardTitle>
              <CardDescription>Configure your script parameters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
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
                <Label htmlFor="topic">Topic *</Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Describe your video topic..."
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {generating ? 'Generating...' : 'Generate Script'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {!output ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Script</CardTitle>
                <CardDescription>Fill in the details and generate a script to see it here.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Clapperboard className="h-12 w-12" />
                  <p className="text-sm">No script generated yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Hook</CardTitle>
                    <CardDescription>First 3 seconds — attention grabber.</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(output.hook, 'hook')}
                  >
                    {copied === 'hook' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm font-medium">{output.hook}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Script</CardTitle>
                    <CardDescription>Full video script — platform optimized.</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(output.script, 'script')}
                  >
                    {copied === 'script' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{output.script}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Call to Action</CardTitle>
                    <CardDescription>End your video with this CTA.</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(output.cta, 'cta')}
                  >
                    {copied === 'cta' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm font-medium">{output.cta}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estimated Duration</CardTitle>
                  <CardDescription>Recommended video length.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-semibold">{output.estimatedDuration}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scene Suggestions</CardTitle>
                  <CardDescription>Visual ideas matching your script.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {output.sceneSuggestions.map((scene, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {i + 1}
                        </span>
                        <span className="text-sm">{scene}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={copyFullScript}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Script
                </Button>
                <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
                <Button onClick={openSchedule}>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Save to Queue
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Script to Queue</DialogTitle>
            <DialogDescription>Choose when this script should be posted.</DialogDescription>
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
            <Button onClick={handleSaveToQueue} disabled={scheduling}>
              {scheduling ? 'Saving...' : 'Save to Queue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
