'use client';

import type { EventClickArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getQueueItems, updateQueueItem } from '@/services/queue';
import type { QueueItem } from '@/types/queue';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  pending_approval: '#eab308',
  approved: '#3b82f6',
  rejected: '#ef4444',
  scheduled: '#22c55e',
  posted: '#16a34a',
  failed: '#ef4444',
};

function toCalendarEvents(items: QueueItem[]) {
  return items
    .filter((item) => item.scheduled_time)
    .map((item) => ({
      id: item.id,
      title: item.caption
        ? `${item.platform}: ${item.caption.slice(0, 60)}${item.caption.length > 60 ? '…' : ''}`
        : `${item.platform} — ${item.status}`,
      start: item.scheduled_time,
      allDay: false,
      backgroundColor: STATUS_COLORS[item.status] ?? '#6b7280',
      borderColor: STATUS_COLORS[item.status] ?? '#6b7280',
      textColor: '#fff',
      extendedProps: { status: item.status, platform: item.platform },
    }));
}

export default function CalendarPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const calendarRef = useRef<FullCalendar>(null);

  const loadItems = useCallback(async () => {
    try {
      const data = await getQueueItems();
      setItems(data);
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadItems();
  }, [loadItems]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadItems();
    toast.success('Calendar refreshed');
  };

  const handleEventClick = (info: EventClickArg) => {
    const item = items.find((i) => i.id === info.event.id);
    if (!item) return;
    toast(
      <div className="space-y-1 text-sm">
        <p className="font-medium">{item.platform}</p>
        <p className="text-muted-foreground">{item.caption?.slice(0, 120) ?? 'No caption'}</p>
        <p className="text-xs text-muted-foreground capitalize">Status: {item.status}</p>
      </div>,
      { duration: 4000 },
    );
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const newDate = info.event.startStr;
    const itemId = info.event.id;

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, scheduled_time: newDate } : i,
      ),
    );

    try {
      await updateQueueItem(itemId, {
        scheduled_time: new Date(newDate).toISOString(),
      });
      toast.success('Rescheduled');
    } catch {
      toast.error('Failed to update schedule');
      info.revert();
    }
  };

  const events = toCalendarEvents(items);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">View and manage scheduled posts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <div className="min-h-[600px]">
        <div className="[&_.fc-theme-standard]:border-border [&_.fc]:text-sm [&_.fc-button]:!shadow-none [&_.fc-button-primary]:!bg-primary [&_.fc-button-primary]:!text-primary-foreground [&_.fc-button-primary]:!border-primary [&_.fc-button-primary:hover]:!bg-primary/90 [&_.fc-button-active]:!bg-primary/80 [&_.fc-today-button]:!bg-muted [&_.fc-today-button]:!text-foreground [&_.fc-toolbar-title]:text-lg [&_.fc-toolbar-title]:font-semibold [&_.fc-col-header-cell]:bg-muted/50 [&_.fc-day-today]:!bg-accent/30 [&_.fc-event]:!rounded-md [&_.fc-event]:!border-none [&_.fc-event]:!px-1.5 [&_.fc-event]:!py-0.5 [&_.fc-event]:!text-xs [&_.fc-event]:!font-medium [&_.fc-event]:!cursor-pointer [&_.fc-daygrid-event]:!mt-1 [&_.fc-timegrid-event]:!p-1.5 [&_.fc-daygrid-day-frame]:!min-h-24 [&_.fc-scrollgrid]:!border-border [&_.fc-scrollgrid-section]:!border-border [&_.fc-daygrid-day]:!border-border [&_.fc-timegrid-slot]:!border-border [&_.fc-popover]:!bg-popover [&_.fc-popover]:!border-border [&_.fc-popover-card]:!shadow-lg [&_.fc-more-popover-misc]:!text-muted-foreground [&_.fc-popover-title]:!font-medium [&_.fc-non-business]:!bg-muted/20 [&_.fc-timegrid-axis]:!bg-muted/30 [&_.fc-timegrid-now-indicator-line]:!border-destructive [&_.fc-timegrid-now-indicator-arrow]:!border-destructive">
          <FullCalendar
            ref={calendarRef}
            key={items.length}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={events}
            editable
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            height="auto"
            contentHeight={500}
            nowIndicator
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            weekNumbers
            weekNumberCalculation="ISO"
            firstDay={1}
            locale="en"
          />
        </div>
      </div>
    </div>
  );
}
