'use client';

import {
  CalendarDays, Sparkles, ChevronLeft, ChevronRight, Trash2, Copy, Check, RefreshCw,
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
import { supabase } from '@/lib/supabase';
import { getPlans, deletePlan, savePlanByToken } from '@/services/planner';
import type { ContentPlan, DailyEntry } from '@/types/planner';

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  TikTok: 'bg-foreground/10 text-foreground border-foreground/30',
  LinkedIn: 'bg-blue-700/10 text-blue-700 border-blue-700/30',
  X: 'bg-muted text-muted-foreground border-border',
  Facebook: 'bg-blue-600/10 text-blue-600 border-blue-600/30',
};

const GOAL_COLORS: Record<string, string> = {
  Awareness: 'bg-purple-500/10 text-purple-500',
  Engagement: 'bg-orange-500/10 text-orange-500',
  Traffic: 'bg-blue-500/10 text-blue-500',
  Sales: 'bg-green-500/10 text-green-500',
  Community: 'bg-yellow-500/10 text-yellow-500',
};

export default function PlannerPage() {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ContentPlan | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewDay, setViewDay] = useState<DailyEntry | null>(null);
  const loadedRef = useRef(false);

  const DAYS_PER_PAGE = 7;

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await getPlans();
      setPlans(data);
      if (data.length > 0 && !selectedPlan) setSelectedPlan(data[0]);
    } catch {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: null, brand: null }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      await savePlanByToken(session?.access_token ?? '', data);

      toast.success('30-day plan created');
      await loadPlans();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePlan(deleteId);
      setPlans((prev) => prev.filter((p) => p.id !== deleteId));
      if (selectedPlan?.id === deleteId)
        setSelectedPlan(plans.find((p) => p.id !== deleteId) ?? null);
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const copyDay = (day: DailyEntry) => {
    const text = `Day ${day.day} (${day.date})\nPlatform: ${day.platform}\nType: ${day.content_type}\nTopic: ${day.topic}\nCaption: ${day.caption_preview}\nHashtags: ${day.hashtags.join(' ')}\nGoal: ${day.goal}`;
    navigator.clipboard.writeText(text);
    setCopiedId(`day-${day.day}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  const days = selectedPlan?.days ?? [];
  const totalPages = Math.ceil(days.length / DAYS_PER_PAGE);
  const pageDays = days.slice(currentPage * DAYS_PER_PAGE, (currentPage + 1) * DAYS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarDays className="h-6 w-6 text-primary" />
            AI Content Planner
          </h1>
          <p className="text-muted-foreground">
            Ghost creates a 30-day content calendar in seconds.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          <Sparkles className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Planning...' : 'Generate 30-Day Plan'}
        </Button>
      </div>

      {plans.length === 0 && !generating && (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No plans yet. Click "Generate 30-Day Plan" to start.
            </p>
          </CardContent>
        </Card>
      )}

      {generating && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto mb-4 h-8 w-8 animate-pulse text-primary" />
            <p className="text-muted-foreground">Ghost is building your content calendar...</p>
          </CardContent>
        </Card>
      )}

      {selectedPlan && days.length > 0 && !generating && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="space-y-2 lg:col-span-1">
            <p className="text-xs font-semibold text-muted-foreground">PLANS</p>
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setSelectedPlan(p); setCurrentPage(0); }}
                className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                  selectedPlan.id === p.id ? 'border-primary ring-1 ring-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                  {p.start_date} → {p.end_date}
                </p>
              </button>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedPlan.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {selectedPlan.start_date} → {selectedPlan.end_date}
                    </p>
                    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                      <RefreshCw className={`mr-1 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                      Regenerate
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Week pagination */}
                <div className="mb-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Week {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pageDays.map((day) => (
                    <button
                      key={day.day}
                      type="button"
                      onClick={() => setViewDay(day)}
                      className="rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">
                          Day {day.day}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{day.date}</span>
                      </div>
                      <div className="mb-2 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${PLATFORM_COLORS[day.platform] ?? ''}`}
                        >
                          {day.platform}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {day.content_type}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm font-medium">{day.topic}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {day.caption_preview}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant="outline" className={`text-[10px] ${GOAL_COLORS[day.goal] ?? ''}`}>
                          {day.goal}
                        </Badge>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); copyDay(day); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === `day-${day.day}` ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Day Detail Dialog */}
      <Dialog open={!!viewDay} onOpenChange={(o) => !o && setViewDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Day {viewDay?.day} — {viewDay?.date}
            </DialogTitle>
          </DialogHeader>
          {viewDay && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={PLATFORM_COLORS[viewDay.platform]}>
                  {viewDay.platform}
                </Badge>
                <Badge variant="secondary">{viewDay.content_type}</Badge>
                <Badge variant="outline" className={GOAL_COLORS[viewDay.goal]}>
                  {viewDay.goal}
                </Badge>
              </div>
              <div>
                <p className="font-medium">{viewDay.topic}</p>
                <p className="mt-2 text-muted-foreground">{viewDay.caption_preview}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Hashtags</p>
                <div className="flex flex-wrap gap-1.5">
                  {viewDay.hashtags.map((h) => (
                    <Badge key={h} variant="secondary" className="text-[10px]">{h}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyDay(viewDay)}>
                {copiedId === `day-${viewDay.day}` ? (
                  <Check className="mr-1 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-1 h-4 w-4" />
                )}
                Copy Day Details
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
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
