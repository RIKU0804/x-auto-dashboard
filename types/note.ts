export type NoteAccount = {
  id: string;
  user_id: string;
  name: string;
  genre_id: string;
  note_email: string;
  x_username: string;
  post_interval_minutes: number;
  is_active: boolean;
  created_at: string;
};

export type NotePost = {
  id: string;
  user_id: string;
  account_id: string;
  cycle: "morning" | "noon" | "night";
  title: string;
  content_free: string;
  note_url: string | null;
  x_tweet_id: string | null;
  status: "queued" | "posted" | "failed";
  error_message: string | null;
  posted_at: string | null;
  created_at: string;
};

export const GENRES = [
  { id: "self-improvement", label: "自己啓発" },
  { id: "business", label: "ビジネス" },
  { id: "health", label: "健康・美容" },
  { id: "technology", label: "テクノロジー" },
] as const;
