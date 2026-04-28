import { createClient } from "@/lib/supabase/server";
import DraftsClient from "./DraftsClient";

export const dynamic = "force-dynamic";

export type DraftRow = {
  id: string;
  account_id: string;
  post_text: string;
  cycle: "morning" | "night" | null;
  scheduled_for: string | null;
  created_at: string;
};

export type AccountSummary = {
  id: string;
  name: string | null;
};

export default async function DraftsPage() {
  const supabase = await createClient();

  const [{ data: drafts }, { data: accounts }] = await Promise.all([
    supabase
      .from("x_posts")
      .select("id, account_id, post_text, cycle, scheduled_for, created_at")
      .eq("status", "draft")
      .order("created_at", { ascending: false }),
    supabase.from("x_accounts").select("id, name").order("created_at"),
  ]);

  return (
    <DraftsClient
      drafts={(drafts ?? []) as DraftRow[]}
      accounts={(accounts ?? []) as AccountSummary[]}
    />
  );
}
