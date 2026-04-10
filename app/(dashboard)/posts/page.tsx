import { createClient } from "@/lib/supabase/server";

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

export default async function PostsPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("x_posts")
    .select("id, account_id, post_text, status, posted_at, cycle, created_at, error_message")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#26251e" }}>X投稿履歴</h1>
      {!posts?.length ? (
        <p className="text-sm text-center py-12" style={{ color: "rgba(38,37,30,0.45)" }}>
          まだ投稿がありません
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl p-4"
              style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: "rgba(38,37,30,0.55)" }}>
                  {p.account_id} · {p.cycle === "morning" ? "🌅 朝" : "🌙 夜"} · {formatDate(p.posted_at ?? p.created_at)}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: statusBg(p.status), color: statusColor(p.status) }}>
                  {statusLabel(p.status)}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#26251e" }}>{p.post_text}</p>
              {p.error_message && (
                <p className="text-xs mt-2" style={{ color: "#b91c1c" }}>{p.error_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
