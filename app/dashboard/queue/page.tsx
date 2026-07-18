'use client';

import {
  Edit,
  Trash2,
  FileText,
  SendHorizonal,
  RotateCcw,
  ListRestart,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getPlatform } from '@/lib/platforms';
import {
  getQueueItems,
  deleteQueueItem,
  updateQueueItem,
  submitForApproval,
} from '@/services/queue';
import type { QueueItem, QueueStatus, PlatformState, PlatformStatus } from '@/types/queue';
import { STATUS_LABELS, STATUS_COLORS, PLATFORM_STATUS_LABELS, PLATFORM_STATUS_COLORS } from '@/types/queue';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const PLATFORMS_LIST = ['Instagram', 'Facebook', 'LinkedIn', 'X', 'TikTok', 'YouTube'] as const;

function PlatformStatusIndicator({ platform, state }: { platform: string; state?: PlatformState }) {
  if (!state) {
    return <span className="text-xs text-slate-500">—</span>;
  }
  const color = PLATFORM_STATUS_COLORS[state.status];
  return (
    <span className={`text-xs font-medium ${color}`}>
      {PLATFORM_STATUS_LABELS[state.status]}
      {state.status === 'failed' && state.retry_count > 0 && (
        <span className="ml-1 text-[10px] text-muted-foreground">({state.retry_count}/3)</span>
      )}
    </span>
  );
}

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [editItem, setEditItem] = useState<QueueItem | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editHour, setEditHour] = useState('12');
  const [editMinute, setEditMinute] = useState('00');
  const [editAmPm, setEditAmPm] = useState<'AM' | 'PM'>('PM');
  const [editStatus, setEditStatus] = useState<QueueStatus>('draft');

  function buildEditISO(): string | null {
    if (!editDate) return null;
    let h = parseInt(editHour, 10);
    if (isNaN(h) || h < 1 || h > 12) h = 12;
    if (editAmPm === 'PM' && h !== 12) h += 12;
    if (editAmPm === 'AM' && h === 12) h = 0;
    const m = parseInt(editMinute, 10);
    const date = new Date(editDate);
    date.setHours(h, isNaN(m) ? 0 : m, 0, 0);
    return date.toISOString();
  }
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<QueueItem | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [publishLogs, setPublishLogs] = useState<Record<string, any[]>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const loadedRef = useRef(false);

  const filteredItems = useMemo(() => {
    let result = items;
    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        (i.caption?.toLowerCase().includes(q)) ||
        (i.platform?.toLowerCase().includes(q)) ||
        (i.status?.toLowerCase().includes(q)) ||
        (new Date(i.scheduled_time).toLocaleDateString().toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return counts;
  }, [items]);

  const validEditStatuses: QueueStatus[] = ['draft', 'pending_approval', 'approved', 'queued', 'published', 'failed', 'partially_published'];

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getQueueItems()
      .then(setItems)
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteQueueItem(deleteId);
      toast.success('Item deleted');
      setItems((prev) => prev.filter((i) => i.id !== deleteId));
    } catch (err: unknown) {
      toast.error(`Failed to delete\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeleteId(null);
    }
  };

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/queue/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ queueItemId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      toast.success(data.message || 'Retry completed');
      const items = await getQueueItems();
      setItems(items);
    } catch (err: unknown) {
      toast.error(`Failed to retry\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRetrying(null);
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      const updated = await submitForApproval(id);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      toast.success('Submitted for approval');
    } catch (err: unknown) {
      toast.error(`Failed to submit\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const openEdit = (item: QueueItem) => {
    setEditItem(item);
    const d = new Date(item.scheduled_time);
    setEditDate(d.toISOString().slice(0, 10));
    const h = d.getHours();
    setEditHour(String(h === 0 ? 12 : h > 12 ? h - 12 : h).padStart(2, '0'));
    setEditMinute(String(d.getMinutes()).padStart(2, '0'));
    setEditAmPm(h >= 12 ? 'PM' : 'AM');
    setEditStatus(item.status);
  };

  const handleEdit = async () => {
    const iso = buildEditISO();
    if (!editItem || !iso) return;
    setSaving(true);
    try {
      const updated = await updateQueueItem(editItem.id, {
        scheduled_time: iso,
        status: editStatus,
      });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success('Item updated');
      setEditItem(null);
    } catch (err: unknown) {
      toast.error(`Failed to update\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const loadPublishLogs = async (itemId: string) => {
    try {
      const res = await fetch(`/api/publish-logs?queueItemId=${itemId}`);
      if (res.ok) {
        const data = await res.json();
        setPublishLogs(prev => ({ ...prev, [itemId]: data }));
      }
    } catch { /* ignore */ }
  };

  const viewPlatform = useMemo(() => viewItem ? getPlatform(viewItem.platform) : undefined, [viewItem]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Queue</h1>
        <p className="text-muted-foreground">Scheduled posts waiting to go live.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Items</CardTitle>
          <CardDescription>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="text-muted-foreground">No scheduled items yet.</p>
              <Link
              href="/dashboard/new-post"
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted hover:text-foreground"
            >
              <FileText className="mr-2 h-4 w-4" />
              Create a new post
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {['all', 'queued', 'publishing', 'published', 'partially_published', 'failed', 'draft'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {STATUS_LABELS[s as QueueStatus] || s.charAt(0).toUpperCase() + s.slice(1)}
                    <span className="ml-1 opacity-60">({statusCounts[s] || 0})</span>
                  </button>
                ))}
                <div className="ml-auto">
                  <Input
                    placeholder="Search by caption, platform, date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-48 text-xs"
                  />
                </div>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Showing {filteredItems.length} of {items.length} items
              </p>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform(s)</TableHead>
                    <TableHead className="hidden sm:table-cell">Caption</TableHead>
                    <TableHead className="hidden md:table-cell">Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No items match the current filter.
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.map((item) => {
                    const p = getPlatform(item.platform);
                    const captionLen = item.caption?.length ?? 0;
                    const overLimit = p ? captionLen > p.captionLimit : false;
                    const platformStates = (item.platforms ?? {}) as Record<string, PlatformState>;
                    const hasPlatforms = Object.keys(platformStates).length > 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            {hasPlatforms ? (
                              Object.entries(platformStates).map(([pl, st]) => (
                                <div key={pl} className="flex items-center gap-1.5">
                                  <span className="text-sm">{pl}</span>
                                  <PlatformStatusIndicator platform={pl} state={st} />
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{item.platform}</span>
                                {p && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {p.captionLimit.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden max-w-xs truncate sm:table-cell">
                          <span className={overLimit ? 'text-destructive' : ''}>
                            {item.caption ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm" suppressHydrationWarning>
                          {formatDate(item.scheduled_time)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={STATUS_COLORS[item.status]}>
                              {STATUS_LABELS[item.status]}
                            </Badge>
                            {item.error_message && (
                              <span className="max-w-[200px] truncate text-xs text-destructive" title={item.error_message}>
                                {item.error_message}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { setViewItem(item); loadPublishLogs(item.id); }}
                              className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            {item.status === 'draft' && (
                              <button
                                type="button"
                                onClick={() => handleSubmitForApproval(item.id)}
                                className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-yellow-500"
                                title="Submit for approval"
                              >
                                <SendHorizonal className="h-4 w-4" />
                              </button>
                            )}
                            {(item.status === 'failed' || item.status === 'partially_published') && (
                              <button
                                type="button"
                                onClick={() => handleRetry(item.id)}
                                disabled={retrying === item.id}
                                className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-orange-500"
                                title="Retry failed platforms"
                              >
                                <RotateCcw className={`h-4 w-4 ${retrying === item.id ? 'animate-spin' : ''}`} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(item.id)}
                              className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Queue Item</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Platform(s):</span>
                <span className="font-medium">{Object.keys(viewItem.platforms ?? {}).length > 0 ? Object.keys(viewItem.platforms ?? {}).join(', ') : viewItem.platform}</span>
                {viewPlatform && (
                  <Badge variant="outline" className="text-[10px]">
                    {viewPlatform.captionLimit.toLocaleString()} chars max
                  </Badge>
                )}
              </div>

              {/* Per-platform status */}
              {Object.keys(viewItem.platforms ?? {}).length > 0 && (
                <div className="rounded-lg border p-3 space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Per-Platform Status</span>
                  {Object.entries(viewItem.platforms as Record<string, PlatformState>).map(([platform, state]) => (
                    <div key={platform} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {state.status === 'published' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : state.status === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : state.status === 'publishing' ? (
                          <Clock className="h-4 w-4 text-purple-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="font-medium">{platform}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={PLATFORM_STATUS_COLORS[state.status]}>
                          {PLATFORM_STATUS_LABELS[state.status]}
                        </span>
                        {state.status === 'failed' && (
                          <span className="text-[10px] text-muted-foreground">({state.retry_count}/3)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                <Badge variant="outline" className={STATUS_COLORS[viewItem.status]}>
                  {STATUS_LABELS[viewItem.status]}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Scheduled:</span>{' '}
                <span className="font-medium" suppressHydrationWarning>{formatDate(viewItem.scheduled_time)}</span>
              </div>
              {viewItem.published_at && (
                <div>
                  <span className="text-muted-foreground">Published:</span>{' '}
                  <span className="font-medium" suppressHydrationWarning>{formatDate(viewItem.published_at)}</span>
                </div>
              )}
              {viewItem.caption && (
                <div>
                  <span className="text-muted-foreground">Caption:</span>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3">{viewItem.caption}</p>
                  {viewPlatform && (
                    <p className={`mt-1 text-xs ${viewItem.caption.length > viewPlatform.captionLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {viewItem.caption.length.toLocaleString()} / {viewPlatform.captionLimit.toLocaleString()} characters
                    </p>
                  )}
                </div>
              )}
              {viewItem.hashtags && (
                <div>
                  <span className="text-muted-foreground">Hashtags:</span>
                  <p className="mt-1 text-primary">{viewItem.hashtags}</p>
                </div>
              )}
              {viewItem.title && (
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <p className="mt-1 font-medium">{viewItem.title}</p>
                </div>
              )}
              {viewItem.error_message && (
                <div>
                  <span className="text-muted-foreground">Errors:</span>
                  <p className="mt-1 rounded-lg bg-destructive/10 p-2 text-sm text-destructive whitespace-pre-wrap">
                    {viewItem.error_message}
                  </p>
                </div>
              )}

              {/* Platform-specific errors */}
              {Object.keys(viewItem.platforms ?? {}).length > 0 && Object.entries(viewItem.platforms as Record<string, PlatformState>).filter(([_, s]) => s.error).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Platform Errors:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(viewItem.platforms as Record<string, PlatformState>).filter(([_, s]) => s.error).map(([pl, s]) => (
                      <div key={pl} className="rounded bg-red-500/5 p-2 text-xs">
                        <span className="font-medium text-red-400">{pl}:</span>{' '}
                        <span className="text-red-300">{s.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Publish Logs */}
              {publishLogs[viewItem.id] && publishLogs[viewItem.id].length > 0 && (
                <div>
                  <span className="text-muted-foreground">Publish Logs:</span>
                  <div className="mt-1 space-y-2">
                    {publishLogs[viewItem.id].map((log: any) => (
                      <div key={log.id} className="rounded border p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{log.platform}</span>
                            {log.status === 'success' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : log.status === 'failed' ? (
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-purple-500" />
                            )}
                            <span className={log.status === 'success' ? 'text-emerald-400' : log.status === 'failed' ? 'text-red-400' : 'text-purple-400'}>
                              {log.status}
                            </span>
                          </div>
                          <span className="text-muted-foreground/60">ID: {log.id?.slice(0, 8)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                          {log.started_at && <div>Started: <span className="text-foreground">{formatDate(log.started_at)}</span></div>}
                          {log.finished_at && <div>Completed: <span className="text-foreground">{formatDate(log.finished_at)}</span></div>}
                          {log.duration_ms != null && <div>Duration: <span className="text-foreground">{(log.duration_ms / 1000).toFixed(1)}s</span></div>}
                          {log.retry_count != null && <div>Retry Count: <span className="text-foreground">{log.retry_count}</span></div>}
                          {log.platform_post_id && <div className="col-span-2">Post ID: <span className="font-mono text-foreground">{log.platform_post_id}</span></div>}
                          {log.platform_post_id && (
                            <div className="col-span-2">
                              Platform URL: <a href={`https://facebook.com/${log.platform_post_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                View Post ↗
                              </a>
                            </div>
                          )}
                        </div>
                        {log.platform_response && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw Response</summary>
                            <pre className="mt-1 max-h-32 overflow-y-auto rounded bg-black/5 p-2 text-[10px] text-muted-foreground">
                              {JSON.stringify(log.platform_response, null, 2)}
                            </pre>
                          </details>
                        )}
                        {log.error_message && (
                          <div className="mt-1 rounded bg-destructive/10 p-1.5 text-red-400">
                            {log.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit / Reschedule Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Queue Item</DialogTitle>
            <DialogDescription>Update the schedule or status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-auto"
                />
                <select
                  value={editHour}
                  onChange={(e) => setEditHour(e.target.value)}
                  className="flex h-9 w-16 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={String(h).padStart(2, '0')}>{h}</option>
                  ))}
                </select>
                <span className="flex items-center text-sm text-muted-foreground">:</span>
                <select
                  value={editMinute}
                  onChange={(e) => setEditMinute(e.target.value)}
                  className="flex h-9 w-16 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  value={editAmPm}
                  onChange={(e) => setEditAmPm(e.target.value as 'AM' | 'PM')}
                  className="flex h-9 w-16 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editStatus">Status</Label>
              <Select value={editStatus} onValueChange={(v) => v && setEditStatus(v as QueueStatus)}>
                <SelectTrigger id="editStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {validEditStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>Are you sure? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
