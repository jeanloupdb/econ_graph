export interface ProjectNotification {
  id: string;
  project_id: string;
  user_id: string;
  source: string;
  type: string;
  title: string;
  body?: string | null;
  priority: number;
  payload?: Record<string, unknown> | null;
  fingerprint?: string | null;
  theme?: string | null;
  objective?: string | null;
  dedup_key?: string | null;
  group_key?: string | null;
  score?: number | null;
  aggregate_count?: number | null;
  last_event_at?: string | null;
  expires_at?: string | null;
  archived_at?: string | null;
  category?: string | null;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationsListResponse {
  project_id: string;
  unread_count: number;
  notifications: ProjectNotification[];
}

export interface InsightsResponse {
  project_id: string;
  unread_count: number;
  headline: ProjectNotification | null;
  notifications: ProjectNotification[];
  sections?: NotificationSection[] | null;
}

export interface NotificationSection {
  key: string;
  title: string;
  notifications: ProjectNotification[];
}
