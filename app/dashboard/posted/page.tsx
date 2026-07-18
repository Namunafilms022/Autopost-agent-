'use client';

import {
  CheckCircle2,
  Clock,
  ImageIcon,
  MessageSquare,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getQueueItems } from '@/services/queue';
import type { QueueItem } from '@/types/queue';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function PostedPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getQueueItems()
      .then((all) => setItems(all.filter((i) => i.status === 'published')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground p-6">Loading...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Posted</h1>
          <p className="text-muted-foreground">Content that has been published.</p>
        </div>
        <div className="flex flex-col items-center gap-4 py-16">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No published posts yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Posted</h1>
        <p className="text-muted-foreground">
          {items.length} published post{items.length !== 1 && 's'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          return (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {item.platform}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="bg-green-600/10 text-green-600 border-green-600/30 shrink-0"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Published
                  </Badge>
                </div>
                {item.published_at && (
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatDate(item.published_at)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {item.caption && (
                  <p className="line-clamp-3 text-muted-foreground">
                    <MessageSquare className="mr-1 inline h-3 w-3" />
                    {item.caption}
                  </p>
                )}
                {item.asset_url && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate text-xs">{item.asset_url}</span>
                  </div>
                )}
                {(item.retry_count ?? 0) > 0 && (
                  <p className="text-xs text-yellow-600">
                    Retried {item.retry_count} time{item.retry_count !== 1 && 's'}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
