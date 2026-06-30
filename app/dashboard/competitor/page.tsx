'use client';

import {
  Search, Hash, FileText, Lightbulb, TrendingUp, Calendar, Trash2, Copy, Check,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { getAnalyses, deleteAnalysis, saveAnalysisByToken } from '@/services/competitor';
import type { CompetitorAnalysis, PostingFrequency, CaptionStyle, BestHashtag, ContentIdea } from '@/types/competitor';
import { PLATFORMS_FOR_ANALYSIS } from '@/types/competitor';

export default function CompetitorPage() {
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selected, setSelected] = useState<CompetitorAnalysis | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('frequency');
  const loadedRef = useRef(false);

  // Input
  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState('Instagram');

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const data = await getAnalyses();
      setAnalyses(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    } catch {
      toast.error('Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!handle.trim()) {
      toast.error('Enter a competitor handle');
      return;
    }
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handle.trim(), platform }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      await saveAnalysisByToken(session?.access_token ?? '', {
        handle: handle.trim(),
        platform,
        posting_frequency: data.posting_frequency ?? {},
        caption_style: data.caption_style ?? {},
        best_hashtags: data.best_hashtags ?? [],
        content_ideas: data.content_ideas ?? [],
        analysis: data.analysis,
      });

      toast.success('Analysis complete');
      await loadAnalyses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAnalysis(deleteId);
      setAnalyses((prev) => prev.filter((a) => a.id !== deleteId));
      if (selected?.id === deleteId) setSelected(analyses.find((a) => a.id !== deleteId) ?? null);
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const copyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  const freq = selected?.posting_frequency as PostingFrequency | undefined;
  const style = selected?.caption_style as CaptionStyle | undefined;
  const tags = (selected?.best_hashtags ?? []) as BestHashtag[];
  const ideas = (selected?.content_ideas ?? []) as ContentIdea[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Search className="h-6 w-6 text-primary" />
          Competitor Analysis
        </h1>
        <p className="text-muted-foreground">Ghost analyzes any competitor's social strategy.</p>
      </div>

      {/* Analyze Input */}
      <Card>
        <CardContent className="flex items-end gap-3 p-4">
          <div className="flex-1 space-y-2">
            <Label>Competitor Handle</Label>
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@nike, @glossier, @garyvee"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => v && setPlatform(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS_FOR_ANALYSIS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAnalyze} disabled={analyzing}>
            <TrendingUp className={`mr-2 h-4 w-4 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </CardContent>
      </Card>

      {analyses.length === 0 && !analyzing && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No analyses yet. Enter a competitor handle above.
          </CardContent>
        </Card>
      )}

      {selected && !analyzing && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* History */}
          <div className="space-y-2 lg:col-span-1">
            <p className="text-xs font-semibold text-muted-foreground">HISTORY</p>
            {analyses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a)}
                className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                  selected.id === a.id ? 'border-primary ring-1 ring-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">@{a.handle}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteId(a.id); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                  {a.platform} · {new Date(a.generated_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>

          {/* Main */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      @{selected.handle}
                      <Badge variant="outline" className="text-xs">{selected.platform}</Badge>
                    </CardTitle>
                    <CardDescription suppressHydrationWarning>
                      Analyzed {new Date(selected.generated_at).toLocaleString()}
                    </CardDescription>
                  </div>
                </div>
                {selected.analysis && (
                  <p className="mt-2 rounded-lg bg-muted p-3 text-sm italic text-muted-foreground">
                    {selected.analysis}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="frequency" className="gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Posting
                    </TabsTrigger>
                    <TabsTrigger value="style" className="gap-1.5">
                      <FileText className="h-4 w-4" />
                      Caption Style
                    </TabsTrigger>
                    <TabsTrigger value="hashtags" className="gap-1.5">
                      <Hash className="h-4 w-4" />
                      Hashtags ({tags.length})
                    </TabsTrigger>
                    <TabsTrigger value="ideas" className="gap-1.5">
                      <Lightbulb className="h-4 w-4" />
                      Ideas ({ideas.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="frequency" className="mt-0">
                    {freq && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg border p-4 text-center">
                            <p className="text-2xl font-bold">{freq.posts_per_week}</p>
                            <p className="text-xs text-muted-foreground">Posts per week</p>
                          </div>
                          <div className="rounded-lg border p-4 text-center">
                            <p className="text-sm font-medium capitalize">{freq.consistency}</p>
                            <p className="text-xs text-muted-foreground">Consistency</p>
                          </div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Best Days</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {(freq.best_days ?? []).map((d) => (
                              <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Best Times</p>
                          <p className="mt-1 font-medium">{freq.best_times}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => copyText(
                          `Posts/week: ${freq.posts_per_week}\nBest days: ${(freq.best_days ?? []).join(', ')}\nBest times: ${freq.best_times}\nConsistency: ${freq.consistency}`,
                          'freq',
                        )}>
                          {copiedId === 'freq' ? <Check className="mr-1 h-4 w-4 text-green-500" /> : <Copy className="mr-1 h-4 w-4" />}
                          Copy
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="style" className="mt-0">
                    {style && (
                      <div className="space-y-3">
                        {[
                          { label: 'Tone', value: style.tone },
                          { label: 'Avg Length', value: style.avg_length },
                          { label: 'Structure', value: style.structure },
                          { label: 'CTA Style', value: style.cta_style },
                        ].map((s) => (
                          <div key={s.label} className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            <p className="mt-0.5 font-medium">{s.value}</p>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => copyText(
                          `Tone: ${style.tone}\nLength: ${style.avg_length}\nStructure: ${style.structure}\nCTA: ${style.cta_style}`,
                          'style',
                        )}>
                          {copiedId === 'style' ? <Check className="mr-1 h-4 w-4 text-green-500" /> : <Copy className="mr-1 h-4 w-4" />}
                          Copy
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="hashtags" className="mt-0">
                    <div className="space-y-2">
                      {tags.map((h, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">#{h.hashtag}</span>
                            <Badge variant="secondary" className="text-[10px]">{h.niche}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{h.usage_count}</span>
                            <button
                              type="button"
                              onClick={() => copyText(h.hashtag, `ht-${i}`)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {copiedId === `ht-${i}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="ideas" className="mt-0">
                    <div className="space-y-3">
                      {ideas.map((idea, i) => (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{idea.topic}</p>
                                  <Badge variant="outline" className="text-[10px]">{idea.format}</Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">{idea.performance}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyText(`${idea.topic} (${idea.format})`, `idea-${i}`)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {copiedId === `idea-${i}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Analysis</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
