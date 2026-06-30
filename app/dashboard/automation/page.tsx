'use client';

import {
  Plus, Clock, CheckCircle2, XCircle, Trash2, Sparkles, RefreshCw, Send, Play, RotateCcw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
} from '@/services/automation';
import type { AutomationRule, AutomationRuleInput, AutomationTriggerType, AutomationActionType } from '@/types/automation';
import {
  AUTOMATION_TEMPLATES,
  TRIGGER_LABELS,
  ACTION_LABELS,
} from '@/types/automation';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'X', 'Threads'];

const ACTION_ICONS: Record<string, typeof Sparkles> = {
  generate: Sparkles,
  post: Send,
  recycle: RotateCcw,
  publish: CheckCircle2,
};

const ACTION_COLORS: Record<string, string> = {
  generate: 'text-blue-500',
  post: 'text-green-500',
  recycle: 'text-orange-500',
  publish: 'text-purple-500',
};

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>('schedule');
  const [actionType, setActionType] = useState<AutomationActionType>('generate');
  const [scheduleDay, setScheduleDay] = useState('Monday');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [generateCount, setGenerateCount] = useState('3');
  const [postPlatforms, setPostPlatforms] = useState<string[]>(['Instagram']);
  const [recycleDays, setRecycleDays] = useState('30');
  const [recycleMax, setRecycleMax] = useState('2');
  const [approvalDelay, setApprovalDelay] = useState('0');
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const data = await getAutomationRules();
      setRules(data);
    } catch {
      toast.error('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setTriggerType('schedule');
    setActionType('generate');
    setScheduleDay('Monday');
    setScheduleTime('10:00');
    setGenerateCount('3');
    setPostPlatforms(['Instagram']);
    setRecycleDays('30');
    setRecycleMax('2');
    setApprovalDelay('0');
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };
  const openTemplate = (t: typeof AUTOMATION_TEMPLATES[number]) => {
    setName(t.name);
    setDescription(t.description);
    setTriggerType(t.trigger_type);
    setActionType(t.action_type);
    if (t.trigger_type === 'schedule') {
      setScheduleDay((t.trigger_config as { day?: string }).day ?? 'Monday');
      setScheduleTime((t.trigger_config as { time?: string }).time ?? '10:00');
    }
    if (t.action_type === 'generate') {
      setGenerateCount(String((t.action_config as { count?: number }).count ?? 3));
      setPostPlatforms((t.action_config as { platforms?: string[] }).platforms ?? ['Instagram']);
    }
    if (t.action_type === 'post') {
      setPostPlatforms((t.action_config as { platforms?: string[] }).platforms ?? ['Instagram']);
      setScheduleTime((t.action_config as { time?: string }).time ?? '10:00');
    }
    if (t.action_type === 'recycle') {
      setRecycleDays(String((t.action_config as { lookback_days?: number }).lookback_days ?? 30));
      setRecycleMax(String((t.action_config as { max_posts?: number }).max_posts ?? 2));
    }
    if (t.action_type === 'publish') {
      setApprovalDelay(String((t.action_config as { delay_minutes?: number }).delay_minutes ?? 0));
    }
    setDialogOpen(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setEditingId(rule.id);
    setName(rule.name);
    setDescription(rule.description ?? '');
    setTriggerType(rule.trigger_type);
    setActionType(rule.action_type);
    if (rule.trigger_type === 'schedule') {
      const tc = rule.trigger_config as { day?: string; time?: string };
      setScheduleDay(tc.day ?? 'Monday');
      setScheduleTime(tc.time ?? '10:00');
    }
    if (rule.action_type === 'generate') {
      const ac = rule.action_config as { count?: number; platforms?: string[] };
      setGenerateCount(String(ac.count ?? 3));
      setPostPlatforms(ac.platforms ?? ['Instagram']);
    }
    if (rule.action_type === 'post') {
      const ac = rule.action_config as { platforms?: string[]; time?: string };
      setPostPlatforms(ac.platforms ?? ['Instagram']);
      setScheduleTime(ac.time ?? '10:00');
    }
    if (rule.action_type === 'recycle') {
      const ac = rule.action_config as { lookback_days?: number; max_posts?: number };
      setRecycleDays(String(ac.lookback_days ?? 30));
      setRecycleMax(String(ac.max_posts ?? 2));
    }
    if (rule.action_type === 'publish') {
      const ac = rule.action_config as { delay_minutes?: number };
      setApprovalDelay(String(ac.delay_minutes ?? 0));
    }
    setDialogOpen(true);
  };

  const buildInput = (): AutomationRuleInput => {
    let trigger_config;
    let action_config;

    if (triggerType === 'schedule') {
      trigger_config = { day: scheduleDay, time: scheduleTime, frequency: 'weekly' as const };
    } else {
      trigger_config = { requires: 'manual_review' as const };
    }

    switch (actionType) {
      case 'generate':
        action_config = { count: parseInt(generateCount) || 3, platforms: postPlatforms };
        break;
      case 'post':
        action_config = { platforms: postPlatforms, time: scheduleTime };
        break;
      case 'recycle':
        action_config = { lookback_days: parseInt(recycleDays) || 30, max_posts: parseInt(recycleMax) || 2 };
        break;
      case 'publish':
        action_config = { delay_minutes: parseInt(approvalDelay) || 0, require_approval: true };
        break;
    }

    return {
      name: name.trim(),
      description: description.trim() || undefined,
      trigger_type: triggerType,
      trigger_config,
      action_type: actionType,
      action_config,
    };
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Rule name is required');
      return;
    }
    setSaving(true);
    try {
      const input = buildInput();
      if (editingId) {
        const updated = await updateAutomationRule(editingId, input);
        setRules((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
        toast.success('Rule updated');
      } else {
        const created = await createAutomationRule(input);
        setRules((prev) => [created, ...prev]);
        toast.success('Rule created');
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    try {
      const updated = await toggleAutomationRule(rule.id, !rule.enabled);
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      toast.success(updated.enabled ? 'Rule enabled' : 'Rule disabled');
    } catch {
      toast.error('Failed to toggle rule');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAutomationRule(deleteId);
      setRules((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success('Rule deleted');
    } catch {
      toast.error('Failed to delete rule');
    } finally {
      setDeleteId(null);
    }
  };

  const togglePlatform = (p: string) => {
    setPostPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const formatSchedule = (rule: AutomationRule) => {
    if (rule.trigger_type === 'approval') return 'On approval';
    const tc = rule.trigger_config as { day?: string; time?: string; frequency?: string };
    return `${tc.day ?? 'Every day'} at ${tc.time ?? '10:00'} (${tc.frequency ?? 'weekly'})`;
  };

  const formatAction = (rule: AutomationRule) => {
    const ac = rule.action_config as { count?: number; platforms?: string[]; lookback_days?: number; max_posts?: number; delay_minutes?: number };
    switch (rule.action_type) {
      case 'generate':
        return `${ac.count ?? 3} posts → ${(ac.platforms ?? ['Instagram']).join(', ')}`;
      case 'post':
        return `→ ${(ac.platforms ?? ['Instagram']).join(', ')}`;
      case 'recycle':
        return `Last ${ac.lookback_days ?? 30}d (max ${ac.max_posts ?? 2})`;
      case 'publish':
        return `${ac.delay_minutes ?? 0}min delay`;
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automation Rules</h1>
          <p className="text-muted-foreground">Schedule and automate your content workflow.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              New Rule
            </Button>
          </div>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
          <CardDescription>Start from a pre-built rule template.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {AUTOMATION_TEMPLATES.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => openTemplate(t)}
                className="flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
              >
                <div className={`mt-0.5 ${ACTION_COLORS[t.action_type]}`}>
                  {(() => {
                    const Icon = ACTION_ICONS[t.action_type];
                    return <Icon className="h-5 w-5" />;
                  })()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No automation rules yet. Create one from a template or start fresh.
            </CardContent>
          </Card>
        )}
        {rules.map((rule) => {
          const Icon = ACTION_ICONS[rule.action_type];
          return (
            <Card key={rule.id} className={rule.enabled ? '' : 'opacity-60'}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${ACTION_COLORS[rule.action_type]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{rule.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {TRIGGER_LABELS[rule.trigger_type]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {ACTION_LABELS[rule.action_type]}
                      </Badge>
                    </div>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatSchedule(rule)}
                      </span>
                      <span>{formatAction(rule)}</span>
                    </div>
                    {rule.last_run_at && (
                      <p className="mt-1 text-xs text-muted-foreground" suppressHydrationWarning>
                        Last run: {new Date(rule.last_run_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={rule.enabled} onCheckedChange={() => handleToggle(rule)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(rule.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) { resetForm(); setDialogOpen(false); }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Rule' : 'New Automation Rule'}</DialogTitle>
            <DialogDescription>Configure when and what to automate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Monday Morning Post" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this rule do?" rows={2} />
            </div>

            {/* Trigger */}
            <div>
              <Label>Trigger</Label>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  variant={triggerType === 'schedule' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTriggerType('schedule')}
                >
                  <Clock className="mr-1 h-4 w-4" />
                  Schedule
                </Button>
                <Button
                  type="button"
                  variant={triggerType === 'approval' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTriggerType('approval')}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  On Approval
                </Button>
              </div>
            </div>

            {triggerType === 'schedule' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select value={scheduleDay} onValueChange={(v) => v && setScheduleDay(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                </div>
              </div>
            )}

            {/* Action */}
            <div>
              <Label>Action</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {(['generate', 'post', 'recycle', 'publish'] as const).map((a) => (
                  <Button
                    key={a}
                    type="button"
                    variant={actionType === a ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActionType(a)}
                  >
                    {(() => {
                      const I = ACTION_ICONS[a];
                      return <I className="mr-1 h-4 w-4" />;
                    })()}
                    {ACTION_LABELS[a]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Config */}
            {actionType === 'generate' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Posts per run</Label>
                  <Input type="number" min="1" max="20" value={generateCount} onChange={(e) => setGenerateCount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Platforms</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <Badge
                        key={p}
                        variant={postPlatforms.includes(p) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => togglePlatform(p)}
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {actionType === 'post' && (
              <div className="space-y-2">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <Badge
                      key={p}
                      variant={postPlatforms.includes(p) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => togglePlatform(p)}
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {actionType === 'recycle' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Lookback days</Label>
                  <Input type="number" min="1" max="365" value={recycleDays} onChange={(e) => setRecycleDays(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Max posts</Label>
                  <Input type="number" min="1" max="20" value={recycleMax} onChange={(e) => setRecycleMax(e.target.value)} />
                </div>
              </div>
            )}

            {actionType === 'publish' && (
              <div className="space-y-2">
                <Label>Delay (minutes)</Label>
                <Input type="number" min="0" max="1440" value={approvalDelay} onChange={(e) => setApprovalDelay(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
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
