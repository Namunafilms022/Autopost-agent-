'use client';

import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLATFORMS } from '@/lib/platforms';
import { supabase } from '@/lib/supabase';

const STYLES = [
  'Casual',
  'Professional',
  'Playful',
  'Luxury',
  'Authoritative',
  'Friendly',
  'Bold',
  'Minimalist',
] as const;

export default function QuickGeneratePage() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('');
  const [style, setStyle] = useState('');

  const [outputCaption, setOutputCaption] = useState('');
  const [outputHashtags, setOutputHashtags] = useState('');
  const [outputImagePrompt, setOutputImagePrompt] = useState('');

  const [copied, setCopied] = useState<'caption' | 'hashtags' | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim() || !platform) {
      toast.error('Please fill in Topic and Platform');
      return;
    }

    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/generate/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          platform,
          style: style || 'Casual',
          supabaseToken: session?.access_token,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setOutputCaption(data.caption);
      setOutputHashtags(data.hashtags);
      setOutputImagePrompt(data.imagePrompt);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'caption' | 'hashtags') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const canGenerate = topic.trim() && platform;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Quick Generate</h1>
        <p className="text-muted-foreground">Topic → Platform → Style → Generate</p>
      </div>

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Create Content</CardTitle>
          <CardDescription>Fill in the details and generate in one click.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Product launch, Behind the scenes, Customer story"
            />
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
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

          {/* Style */}
          <div className="space-y-2">
            <Label htmlFor="style">Style (optional)</Label>
            <Select value={style} onValueChange={(v) => setStyle(v ?? '')}>
              <SelectTrigger id="style">
                <SelectValue placeholder="Choose a style" />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </CardContent>
      </Card>

      {/* Outputs */}
      {outputCaption && (
        <div className="space-y-4">
          {/* Caption */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Caption</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(outputCaption, 'caption')}>
                {copied === 'caption' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{outputCaption}</p>
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Hashtags</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(outputHashtags, 'hashtags')}>
                {copied === 'hashtags' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{outputHashtags}</p>
            </CardContent>
          </Card>

          {/* Image Prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Image Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{outputImagePrompt}</p>
            </CardContent>
          </Card>

          {/* Regenerate */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
