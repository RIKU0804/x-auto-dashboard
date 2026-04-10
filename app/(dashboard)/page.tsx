import { createClient } from "@/lib/supabase/server";
import RunButton from "@/components/RunButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: accounts }, { data: todayPosts }, { data: recentPosts }] = await Promise.all([
    supabase.from("x_accounts").select("id, name, is_active").order("created_at"),
    supabase.from("x_posts").select("id, status").gte("created_at", `${today}T00:00:00`),
    supabase.from("x_posts")
      .select("id, account_id, post_text, status, posted_at, cycle")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const activeCount = accounts?.filter((a) => a.is_active).length ?? 0;
  const todayPosted = todayPosts?.filter((p) => p.status === "posted").length ?? 0;
  const todayFailed = todayPosts?.filter((p) => p.status === "failed").length ?? 0;

  const statusColor = (s: string) =>
    s === "posted" ? "var(--success)" : s === "failed" ? "var(--danger)" : "var(--warning)";
  const statusLabel = (s: string) =>
    s === "posted" ? "投稿済" : s === "failed" ? "失敗" : "待機中";

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "今日の投稿", value: todayPosted, unit: "件" },
          { label: "失敗", value: todayFailed, unit: "件", warn: todayFailed > 0 },
          { label: "稼働中", value: activeCount, unit: "アカウント" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-2xl font-bold" style={{ color: s.warn ? "var(--danger)" : "var(--text)" }}>
              {s.value}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Manual run */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="font-medium text-sm">手動実行</div>
        <div className="grid grid-cols-2 gap-3">
          <RunButton cycle="morning" label="🌅 朝サイクル" />
          <RunButton cycle="night" label="🌙 夜サイクル" />
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          実行後、Discordに通知が届きます。完了まで数分かかります。
        </p>
      </div>

      {/* Recent posts */}
      <div>
        <div className="text-sm font-medium mb-3">直近の投稿</div>
        {!recentPosts?.length ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>まだ投稿がありません</p>
        ) : (
          <div className="space-y-2">
            {recentPosts.map((p) => (
              <div key={p.id} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {p.account_id} · {p.cycle === "morning" ? "🌅 朝" : "🌙 夜"}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: `${statusColor(p.status)}18`, color: statusColor(p.status) }}>
                    {statusLabel(p.status)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{p.post_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
