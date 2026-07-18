'use client';

import { useEffect, useState } from 'react';
import { BarChart3, ListOrdered, CheckCircle2, XCircle, Clock, Timer, Activity, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import type { QueueItem } from '@/types/queue';

interface LogEvent {
  id: string;
  platform: string;
  status: string;
  error_message: string | null;
  started_at: string;
  created_at: string;
  queue_item_id: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    queued: 0, published: 0, failed: 0, total: 0,
    publishing: 0, partial: 0, publishedToday: 0,
  });
  const [recent, setRecent] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [avgPublishTime, setAvgPublishTime] = useState<number | null>(null);
  const [successRate, setSuccessRate] = useState<number>(100);
  const [activityFeed, setActivityFeed] = useState<LogEvent[]>([]);
  const [workerStatus, setWorkerStatus] = useState<{
    running: boolean;
    queueSize: number;
    lastPublish: string | null;
    lastFailure: string | null;
  }>({ running: false, queueSize: 0, lastPublish: null, lastFailure: null });

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboard() {
    const { data: items, error: err } = await supabase
      .from('queue_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) { setError(err.message); return; }
    const allItems = (items ?? []) as QueueItem[];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setStats({
      total: allItems.length,
      queued: allItems.filter(i => i.status === 'approved' || i.status === 'queued' || i.status === 'draft').length,
      published: allItems.filter(i => i.status === 'published').length,
      failed: allItems.filter(i => i.status === 'failed').length,
      publishing: allItems.filter(i => i.status === 'publishing').length,
      partial: allItems.filter(i => i.status === 'partially_published').length,
      publishedToday: allItems.filter(i => i.status === 'published' && new Date(i.published_at || i.updated_at) >= today).length,
    });

    setWorkerStatus(prev => ({
      ...prev,
      queueSize: allItems.filter(i => i.status === 'approved' || i.status === 'queued').length,
    }));

    setRecent(allItems.slice(0, 5));

    const published = allItems.filter(i => i.status === 'published');
    setSuccessRate(allItems.length > 0 ? Math.round((published.length / allItems.length) * 100) : 100);

    const { data: logs } = await supabase
      .from('publish_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (logs) {
      const events = logs as LogEvent[];
      setActivityFeed(events);

      const durations = events.filter(e => e.status === 'success' || e.status === 'failed')
        .map(e => {
          if (!e.started_at) return null;
          const created = new Date(e.created_at).getTime();
          const started = new Date(e.started_at).getTime();
          return created - started;
        })
        .filter((d): d is number => d !== null && d > 0);

      if (durations.length > 0) {
        setAvgPublishTime(Math.round(durations.reduce((a, b) => a + b, 0) / durations.length));
      }

      const lastSuccess = events.find(e => e.status === 'success');
      const lastFail = events.find(e => e.status === 'failed');
      setWorkerStatus(prev => ({
        ...prev,
        lastPublish: lastSuccess?.created_at ?? prev.lastPublish,
        lastFailure: lastFail?.created_at ?? prev.lastFailure,
        running: events.some(e => e.status === 'publishing'),
      }));
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Could not load dashboard: {error}</p>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your AutoPost activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-500">{stats.publishedToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <ListOrdered className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">{stats.queued}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Publishing</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-500">{stats.publishing}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Partial</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-500">{stats.partial}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Publish Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgPublishTime ? formatDuration(avgPublishTime) : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${successRate >= 80 ? 'text-emerald-500' : successRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {successRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Worker Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`flex items-center gap-1.5 font-medium ${workerStatus.running ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  <span className={`h-2 w-2 rounded-full ${workerStatus.running ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {workerStatus.running ? 'Running' : 'Idle'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Queue Size</span>
                <span className="font-medium">{workerStatus.queueSize}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Jobs Processing</span>
                <span className="font-medium">{stats.publishing}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Publish</span>
                <span className="font-medium">{workerStatus.lastPublish ? new Date(workerStatus.lastPublish).toLocaleTimeString() : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Failure</span>
                <span className="font-medium text-red-500">{workerStatus.lastFailure ? new Date(workerStatus.lastFailure).toLocaleTimeString() : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg Publish Time</span>
                <span className="font-medium">{avgPublishTime ? formatDuration(avgPublishTime) : '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto">
            {activityFeed.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-1.5">
                {activityFeed.map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 font-medium ${
                        event.status === 'success' ? 'text-emerald-500' :
                        event.status === 'failed' ? 'text-red-500' :
                        event.status === 'publishing' ? 'text-purple-500' :
                        'text-muted-foreground'
                      }`}>
                        {event.platform}
                      </span>
                      <span className="capitalize text-muted-foreground">{event.status}</span>
                      {event.error_message && (
                        <span className="truncate text-red-400/70 max-w-[200px]" title={event.error_message}>
                          {event.error_message}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts yet. Create one in New Post.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="truncate">{item.caption?.slice(0, 60) || item.platform}</span>
                  <span className="text-xs text-muted-foreground capitalize">{item.status}</span>
                </div>
              ))}
              <Link href="/dashboard/queue" className="block text-center text-xs text-primary hover:underline pt-2">
                View all queue items
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Link href="/dashboard/new-post" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          New Post
        </Link>
        <Link href="/dashboard/automation" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
          Automation
        </Link>
        <Link href="/dashboard/queue" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
          Queue
        </Link>
      </div>
    </div>
  );
}
