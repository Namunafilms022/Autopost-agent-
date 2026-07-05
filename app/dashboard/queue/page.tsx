'use client';

import {
  Edit,
  Trash2,
  FileText,
  SendHorizonal,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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
import type { QueueItem, QueueStatus } from '@/types/queue';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/queue';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
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
  const loadedRef = useRef(false);

  const validEditStatuses: QueueStatus[] = ['draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'posted', 'failed'];

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
    try {
      const res = await fetch('/api/queue/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      toast.success(data.message || 'Post queued for retry');
      const items = await getQueueItems();
      setItems(items);
    } catch (err: unknown) {
      toast.error(`Failed to retry\n\nReason: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead className="hidden sm:table-cell">Caption</TableHead>
                    <TableHead className="hidden md:table-cell">Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const p = getPlatform(item.platform);
                    const captionLen = item.caption?.length ?? 0;
                    const overLimit = p ? captionLen > p.captionLimit : false;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {item.platform}
                            {p && (
                              <span className="text-[10px] text-muted-foreground">
                                {p.captionLimit.toLocaleString()}
                              </span>
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
                            {item.retry_count > 0 && (
                              <span className="text-xs text-muted-foreground">({item.retry_count}/3)</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewItem(item)}
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
                            {item.status === 'failed' && (item.retry_count ?? 0) < 3 && (
                              <button
                                type="button"
                                onClick={() => handleRetry(item.id)}
                                className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-orange-500"
                                title={`Retry (attempt ${(item.retry_count ?? 0) + 1}/3)`}
                              >
                                <RotateCcw className="h-4 w-4" />
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
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Queue Item</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Platform:</span>
                <span className="font-medium">{viewItem.platform}</span>
                {viewPlatform && (
                  <Badge variant="outline" className="text-[10px]">
                    {viewPlatform.captionLimit.toLocaleString()} chars max
                  </Badge>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Scheduled:</span>{' '}
                <span className="font-medium" suppressHydrationWarning>{formatDate(viewItem.scheduled_time)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                <Badge variant="outline" className={STATUS_COLORS[viewItem.status]}>
                  {STATUS_LABELS[viewItem.status]}
                </Badge>
              </div>
              {viewItem.caption && (
                <div>
                  <span className="text-muted-foreground">Caption:</span>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3">
                    {viewItem.caption}
                  </p>
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
              {viewItem.image_prompt && (
                <div>
                  <span className="text-muted-foreground">Image Prompt:</span>
                  <p className="mt-1 text-muted-foreground">{viewItem.image_prompt}</p>
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
                  <span className="text-muted-foreground">Error:</span>
                  <p className="mt-1 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                    {viewItem.error_message}
                  </p>
                  {viewItem.retry_count > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Retries: {viewItem.retry_count}/3
                    </p>
                  )}
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
