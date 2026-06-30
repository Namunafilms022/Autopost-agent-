'use client';

import {
  Sparkles, Hash, Music, Lightbulb, TrendingUp, Trash2, RefreshCw, Copy, Check,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { getResearchHistory, deleteResearch, saveResearchByToken } from '@/services/research';
import type { ContentResearch, ResearchTopic, ResearchHashtag, ResearchAudio, ResearchIdea } from '@/types/research';

const TABS = [
  { id: 'topics', label: 'Topics', icon: TrendingUp },
  { id: 'hashtags', label: 'Hashtags', icon: Hash },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
] as const;

export default function ResearchPage() {
  const [researchList, setResearchList] = useState<ContentResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('topics');
  const [selectedResearch, setSelectedResearch] = useState<ContentResearch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getResearchHistory();
      setResearchList(data);
      if (data.length > 0 && !selectedResearch) {
        setSelectedResearch(data[0]);
      }
    } catch {
      toast.error('Failed to load research history');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: null, industry: null }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      await saveResearchByToken(session?.access_token ?? '', {
        topics: data.topics ?? [],
        hashtags: data.hashtags ?? [],
        audio: data.audio ?? [],
        ideas: data.ideas ?? [],
      });

      toast.success('Research generated');
      await loadHistory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteResearch(deleteId);
      setResearchList((prev) => prev.filter((r) => r.id !== deleteId));
      if (selectedResearch?.id === deleteId) {
        setSelectedResearch(researchList.find((r) => r.id !== deleteId) ?? null);
      }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <TrendingUp className="h-6 w-6 text-primary" />
            Content Research
          </h1>
          <p className="text-muted-foreground">
            Ghost finds trending topics, hashtags, audio, and viral ideas.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          <Sparkles className="mr-2 h-4 w-4" />
          {generating ? 'Researching...' : 'Research Now'}
        </Button>
      </div>

      {researchList.length === 0 && !generating && (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingUp className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No research yet. Click "Research Now" to discover trends.</p>
          </CardContent>
        </Card>
      )}

      {generating && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto mb-4 h-8 w-8 animate-pulse text-primary" />
            <p className="text-muted-foreground">Ghost is scanning trends...</p>
          </CardContent>
        </Card>
      )}

      {researchList.length > 0 && selectedResearch && !generating && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* History sidebar */}
          <div className="space-y-2 lg:col-span-1">
            <p className="text-xs font-semibold text-muted-foreground">HISTORY</p>
            {researchList.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedResearch(r)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent ${
                  selectedResearch.id === r.id ? 'border-primary ring-1 ring-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {new Date(r.generated_at).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.topics?.length ?? 0} topics · {r.hashtags?.length ?? 0} hashtags
                </p>
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Trend Report</CardTitle>
                    <CardDescription suppressHydrationWarning>
                      Generated {new Date(selectedResearch.generated_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                    <RefreshCw className={`mr-1 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    {TABS.map((t) => {
                      const Icon = t.icon;
                      const count = (selectedResearch as unknown as Record<string, unknown[]>)[t.id]?.length ?? 0;
                      return (
                        <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                          <Icon className="h-4 w-4" />
                          {t.label}
                          <Badge variant="secondary" className="ml-1 text-[10px]">{count}</Badge>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  <TabsContent value="topics" className="mt-0 space-y-3">
                    {(selectedResearch.topics ?? []).map((t: ResearchTopic, i: number) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{t.topic}</p>
                                <Badge variant="outline" className="text-[10px]">{t.platform}</Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{t.reason}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-sm font-semibold">
                                <TrendingUp className={`h-4 w-4 ${(t.trend_score ?? 0) > 70 ? 'text-green-500' : (t.trend_score ?? 0) > 40 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                                {t.trend_score}
                              </div>
                              <button
                                type="button"
                                onClick={() => copyText(t.topic, `topic-${i}`)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {copiedId === `topic-${i}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="hashtags" className="mt-0 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(selectedResearch.hashtags ?? []).map((h: ResearchHashtag, i: number) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="cursor-pointer gap-1.5 px-3 py-1.5 text-sm"
                          onClick={() => copyText(`#${h.hashtag}`, `hashtag-${i}`)}
                        >
                          #{h.hashtag}
                          {copiedId === `hashtag-${i}` ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      {(selectedResearch.hashtags ?? []).map((h: ResearchHashtag, i: number) => (
                        <div key={i} className="rounded-lg border p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">#{h.hashtag}</span>
                            <span className="text-xs text-muted-foreground">{h.posts_estimate}</span>
                          </div>
                          <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-[10px]">{h.category}</Badge>
                            <span>{h.relevance}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="audio" className="mt-0 space-y-3">
                    {(selectedResearch.audio ?? []).map((a: ResearchAudio, i: number) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{a.title}</p>
                                <Badge variant="outline" className="text-[10px]">{a.genre}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">by {a.creator} · {a.mood}</p>
                              <p className="mt-2 text-sm text-muted-foreground">{a.why_trending}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyText(`${a.title} by ${a.creator}`, `audio-${i}`)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {copiedId === `audio-${i}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="ideas" className="mt-0 space-y-3">
                    {(selectedResearch.ideas ?? []).map((idea: ResearchIdea, i: number) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{idea.title}</p>
                                <Badge variant="outline" className="text-[10px]">{idea.format}</Badge>
                                <Badge variant="secondary" className="text-[10px]">{idea.estimated_reach}</Badge>
                              </div>
                              <p className="mt-2 text-sm italic text-muted-foreground">
                                "{idea.hook}"
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyText(`${idea.title}\n\nHook: ${idea.hook}\nFormat: ${idea.format}`, `idea-${i}`)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {copiedId === `idea-${i}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Research</DialogTitle>
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
