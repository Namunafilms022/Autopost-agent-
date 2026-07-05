export interface AutomationState {
  id: string;
  user_id: string;
  enabled: boolean;
  last_run_at: string | null;
  posts_published_today: number;
  created_at: string;
  updated_at: string;
}
