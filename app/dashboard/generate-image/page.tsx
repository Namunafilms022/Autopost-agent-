'use client';

import { Sparkles, CalendarClock, CheckCircle2, Copy, Check, Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createQueueItem } from '@/services/queue';

type Step = 'caption' | 'image' | 'schedule' | 'done';

export default function GenerateImagePage() {
  const [step, setStep] = useState<Step>('caption');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const handleGenerate = async () => {
    if (!caption.trim()) {
      toast.error('Please enter a caption');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: caption.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setImageUrl(data.imageUrl);
      setStep('image');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate) {
      toast.error('Please select date and time');
      return;
    }
    setScheduling(true);
    try {
      await createQueueItem({
        brand_id: '',
        platform: 'Instagram',
        caption,
        hashtags: null,
        image_prompt: caption,
        asset_url: imageUrl,
        scheduled_time: new Date(scheduleDate).toISOString(),
        status: 'draft',
      });
      setStep('done');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule');
    } finally {
      setScheduling(false);
    }
  };

  const copyImageUrl = async () => {
    await navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setCaption('');
    setImageUrl('');
    setStep('caption');
    setScheduleDate('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Generate Image</h1>
        <p className="text-muted-foreground">Caption → Generate Image → Schedule → Done</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        {['caption', 'image', 'schedule', 'done'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                ['caption', 'image', 'schedule', 'done'].indexOf(step) >= i
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {s === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < 3 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Caption */}
      {step === 'caption' && (
        <Card>
          <CardHeader>
            <CardTitle>Write Your Caption</CardTitle>
            <CardDescription>This will be used to generate an image.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="genCaption">Caption</Label>
              <Input
                id="genCaption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g., A serene mountain lake at sunrise with mist"
              />
            </div>
            <Button onClick={handleGenerate} disabled={!caption.trim() || generating} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              {generating ? 'Generating...' : 'Generate Image'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Image */}
      {step === 'image' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Image</CardTitle>
              <CardDescription>AI-generated based on your caption.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-lg border">
                <img src={imageUrl} alt="Generated" className="w-full object-cover" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyImageUrl}>
                  {copied ? <Check className="mr-1 h-4 w-4 text-green-500" /> : <Copy className="mr-1 h-4 w-4" />}
                  Copy URL
                </Button>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('caption')}>
              Back
            </Button>
            <Button onClick={() => setStep('schedule')} className="flex-1">
              <CalendarClock className="mr-2 h-4 w-4" />
              Schedule
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Schedule */}
      {step === 'schedule' && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Post</CardTitle>
            <CardDescription>Choose when this should go live.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <img src={imageUrl} alt="Generated" className="h-40 w-full object-cover" />
            </div>
            <p className="text-sm text-muted-foreground">{caption}</p>
            <div className="space-y-2">
              <Label htmlFor="imgSchedule">Date & Time</Label>
              <Input
                id="imgSchedule"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('image')}>
                Back
              </Button>
              <Button onClick={handleSchedule} disabled={!scheduleDate || scheduling} className="flex-1">
                {scheduling ? 'Scheduling...' : 'Schedule & Done'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold">All Done!</h2>
              <p className="text-muted-foreground">
                Your post has been scheduled for{' '}
                {new Date(scheduleDate).toLocaleString()}.
              </p>
            </div>
            <Button onClick={reset}>
              Create Another
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
