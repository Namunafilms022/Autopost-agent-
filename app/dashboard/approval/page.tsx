'use client';

import {
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Filter,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getPlatform } from '@/lib/platforms';
import {
  getQueueItems,
  approveQueueItem,
  rejectQueueItem,
} from '@/services/queue';
import type { QueueItem } from '@/types/queue';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/queue';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ApprovalPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [reviewItem, setReviewItem] = useState<QueueItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await getQueueItems();
      setItems(data);
    } catch {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const pendingItems = items.filter(
    (i) => i.status === 'pending_approval',
  );

  const filteredItems = platformFilter === 'all'
    ? pendingItems
    : pendingItems.filter((i) => i.platform === platformFilter);

  const platforms = [...new Set(pendingItems.map((i) => i.platform))];

  const handleApprove = async () => {
    if (!reviewItem) return;
    setActionLoading(true);
    try {
      const updated = await approveQueueItem(reviewItem.id);
      setItems((prev) => prev.map((i) => (i.id === reviewItem.id ? updated : i)));
      toast.success('Approved');
      setReviewItem(null);
    } catch {
      toast.error('Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewItem) return;
    setActionLoading(true);
    try {
      const updated = await rejectQueueItem(reviewItem.id);
      setItems((prev) => prev.map((i) => (i.id === reviewItem.id ? updated : i)));
      toast.success('Rejected');
      setReviewItem(null);
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval</h1>
          <p className="text-muted-foreground">Review and approve queued posts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={platformFilter} onValueChange={(v) => v && setPlatformFilter(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadItems}>
            <Clock className="mr-1 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No items pending approval.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const p = getPlatform(item.platform);
            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="outline" className={STATUS_COLORS[item.status]}>
                      {STATUS_LABELS[item.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{item.platform}</span>
                  </div>
                  <p className="mb-2 line-clamp-3 text-sm">
                    {item.caption ?? 'No caption'}
                  </p>
                  {item.title && (
                    <p className="mb-2 text-xs font-medium">{item.title}</p>
                  )}
                  {item.hashtags && (
                    <p className="mb-3 text-xs text-primary line-clamp-2">{item.hashtags}</p>
                  )}
                  <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground" suppressHydrationWarning>
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(item.scheduled_time)}
                    {p && (
                      <span className="ml-auto">{p.captionLimit.toLocaleString()} chars</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setReviewItem(item)}
                    >
                      <FileText className="mr-1 h-4 w-4" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-green-500 hover:text-green-500"
                      onClick={async () => {
                        try {
                          const updated = await approveQueueItem(item.id);
                          setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
                          toast.success('Approved');
                        } catch {
                          toast.error('Failed to approve');
                        }
                      }}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={async () => {
                        try {
                          const updated = await rejectQueueItem(item.id);
                          setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
                          toast.success('Rejected');
                        } catch {
                          toast.error('Failed to reject');
                        }
                      }}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewItem} onOpenChange={(o) => !o && setReviewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Post</DialogTitle>
            <DialogDescription>Approve or reject this post.</DialogDescription>
          </DialogHeader>
          {reviewItem && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Platform:</span>
                <span className="font-medium">{reviewItem.platform}</span>
              </div>
              <div suppressHydrationWarning>
                <span className="text-muted-foreground">Scheduled:</span>{' '}
                <span className="font-medium">{formatDate(reviewItem.scheduled_time)}</span>
              </div>
              {reviewItem.title && (
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <p className="mt-1 font-medium">{reviewItem.title}</p>
                </div>
              )}
              {reviewItem.caption && (
                <div>
                  <span className="text-muted-foreground">Caption:</span>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3">
                    {reviewItem.caption}
                  </p>
                </div>
              )}
              {reviewItem.hashtags && (
                <div>
                  <span className="text-muted-foreground">Hashtags:</span>
                  <p className="mt-1 text-primary">{reviewItem.hashtags}</p>
                </div>
              )}
              {reviewItem.image_prompt && (
                <div>
                  <span className="text-muted-foreground">Image Prompt:</span>
                  <p className="mt-1 text-muted-foreground">{reviewItem.image_prompt}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewItem(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleReject}
              disabled={actionLoading}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={actionLoading}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
