import { createClient } from "@/lib/supabase/server";
import RunButton from "@/components/RunButton";

export const dynamic = "force-dynamic";

const statusColor = (s: string) =>
  s === "posted" ? "#15803d" : s === "failed" ? "#b91c1c" : "#92400e";
const statusBg = (s: string) =>
  s === "posted" ? "#dcfce7" : s === "failed" ? "#fee2e2" : "#fef3c7";
const statusLabel = (s: string) =>
  s === "posted" ? "投稿済" : s === "failed" ? "失敗" : "待機中";

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

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

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#26251e" }}>ダッシュボード</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "今日の投稿", value: todayPosted },
          { label: "失敗", value: todayFailed, warn: todayFailed > 0 },
          { label: "稼働中", value: activeCount },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center"
            style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}>
            <div className="text-3xl font-bold" style={{ color: s.warn ? "#b91c1c" : "#26251e" }}>
              {s.value}
            </div>
            <div className="text-xs mt-1 font-medium" style={{ color: "rgba(38,37,30,0.6)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Manual run */}
      <div className="rounded-xl p-5 space-y-4"
        style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}>
        <div className="font-semibold text-sm" style={{ color: "#26251e" }}>手動実行</div>
        <div className="grid grid-cols-2 gap-3">
          <RunButton cycle="morning" label="🌅 朝サイクル" />
          <RunButton cycle="night" label="🌙 夜サイクル" />
        </div>
        <p className="text-xs" style={{ color: "rgba(38,37,30,0.55)" }}>
          実行後、Discordに通知が届きます。完了まで数分かかります。
        </p>
      </div>

      {/* Recent posts */}
      <div>
        <div className="text-sm font-semibold mb-3" style={{ color: "#26251e" }}>直近の投稿</div>
        {!recentPosts?.length ? (
          <p className="text-sm text-center py-8" style={{ color: "rgba(38,37,30,0.45)" }}>まだ投稿がありません</p>
        ) : (
          <div className="space-y-2">
            {recentPosts.map((p) => (
              <div key={p.id} className="rounded-xl p-4"
                style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "rgba(38,37,30,0.55)" }}>
                    {p.account_id} · {p.cycle === "morning" ? "🌅 朝" : "🌙 夜"} · {formatDate(p.posted_at)}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: statusBg(p.status), color: statusColor(p.status) }}>
                    {statusLabel(p.status)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#26251e" }}>{p.post_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
