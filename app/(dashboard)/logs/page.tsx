import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const levelColor = (l: string) =>
  l === "error" ? "var(--danger)" : l === "warning" ? "var(--warning)" : "var(--success)";
const levelLabel = (l: string) =>
  l === "error" ? "❌ エラー" : l === "warning" ? "⚠️ 警告" : "✅ 情報";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function LogsPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("x_logs")
    .select("id, account_id, level, module, message, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="font-semibold text-base">実行ログ</h1>
      {!logs?.length ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--text-muted)" }}>
          ログがありません
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl p-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: levelColor(log.level) }}>
                    {levelLabel(log.level)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "rgba(38,37,30,0.06)", color: "var(--text-muted)", fontFamily: "monospace" }}>
                    {log.module}
                  </span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatDate(log.created_at)}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{log.message}</p>
              {log.account_id && (
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{log.account_id}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
