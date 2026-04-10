import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const statusColor = (s: string) =>
  s === "posted" ? "var(--success)" : s === "failed" ? "var(--danger)" : "var(--warning)";
const statusLabel = (s: string) =>
  s === "posted" ? "投稿済" : s === "failed" ? "失敗" : "待機中";

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function PostsPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("x_posts")
    .select("id, account_id, post_text, status, posted_at, cycle, created_at, error_message")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <h1 className="font-semibold text-base">投稿履歴</h1>
      {!posts?.length ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--text-muted)" }}>
          まだ投稿がありません
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {p.account_id} · {p.cycle === "morning" ? "🌅 朝" : "🌙 夜"} · {formatDate(p.posted_at ?? p.created_at)}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: `${statusColor(p.status)}18`, color: statusColor(p.status) }}>
                  {statusLabel(p.status)}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{p.post_text}</p>
              {p.error_message && (
                <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>{p.error_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
