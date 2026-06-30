export type AutomationTriggerType = 'schedule' | 'approval';
export type AutomationActionType = 'generate' | 'post' | 'recycle' | 'publish';

export interface ScheduleTriggerConfig {
  cron?: string;
  day?: string;
  time?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
}

export interface ApprovalTriggerConfig {
  requires: 'manual_review' | 'ai_review';
}

export interface GenerateActionConfig {
  count: number;
  platforms: string[];
  contentType?: string;
  style?: string;
}

export interface PostActionConfig {
  platforms: string[];
  time?: string;
}

export interface RecycleActionConfig {
  lookback_days: number;
  max_posts: number;
}

export interface PublishActionConfig {
  delay_minutes: number;
  require_approval: boolean;
}

export interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  trigger_type: AutomationTriggerType;
  trigger_config: ScheduleTriggerConfig | ApprovalTriggerConfig;
  action_type: AutomationActionType;
  action_config: GenerateActionConfig | PostActionConfig | RecycleActionConfig | PublishActionConfig;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRuleInput {
  name: string;
  description?: string;
  trigger_type: AutomationTriggerType;
  trigger_config: ScheduleTriggerConfig | ApprovalTriggerConfig;
  action_type: AutomationActionType;
  action_config: GenerateActionConfig | PostActionConfig | RecycleActionConfig | PublishActionConfig;
  enabled?: boolean;
}

export const AUTOMATION_TEMPLATES = [
  {
    name: 'Post every Monday 10 AM',
    description: 'Automatically publish a post every Monday morning at 10 AM.',
    trigger_type: 'schedule' as const,
    trigger_config: { day: 'Monday', time: '10:00', frequency: 'weekly' },
    action_type: 'post' as const,
    action_config: { platforms: ['Instagram'], time: '10:00' },
  },
  {
    name: 'Generate 3 posts every Friday',
    description: 'Generate 3 new AI posts every Friday for next week.',
    trigger_type: 'schedule' as const,
    trigger_config: { day: 'Friday', time: '09:00', frequency: 'weekly' },
    action_type: 'generate' as const,
    action_config: { count: 3, platforms: ['Instagram'] },
  },
  {
    name: 'Recycle top performing content',
    description: 'Repost the best-performing content from the last 30 days.',
    trigger_type: 'schedule' as const,
    trigger_config: { day: 'Monday', time: '12:00', frequency: 'weekly' },
    action_type: 'recycle' as const,
    action_config: { lookback_days: 30, max_posts: 2 },
  },
  {
    name: 'Auto publish after approval',
    description: 'Automatically publish queued posts once they are approved.',
    trigger_type: 'approval' as const,
    trigger_config: { requires: 'manual_review' },
    action_type: 'publish' as const,
    action_config: { delay_minutes: 0, require_approval: true },
  },
];

export const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  schedule: 'Schedule',
  approval: 'Approval',
};

export const ACTION_LABELS: Record<AutomationActionType, string> = {
  generate: 'Generate Content',
  post: 'Publish Post',
  recycle: 'Recycle Content',
  publish: 'Auto Publish',
};
