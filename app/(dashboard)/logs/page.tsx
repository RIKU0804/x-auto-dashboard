import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const levelStyle = (l: string) =>
  l === "error"
    ? { color: "#b91c1c", bg: "#fee2e2", label: "❌ エラー" }
    : l === "warning"
    ? { color: "#92400e", bg: "#fef3c7", label: "⚠️ 警告" }
    : { color: "#15803d", bg: "#dcfce7", label: "✅ 情報" };

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
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#26251e" }}>実行ログ</h1>
      {!logs?.length ? (
        <p className="text-sm text-center py-12" style={{ color: "rgba(38,37,30,0.45)" }}>ログがありません</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const s = levelStyle(log.level);
            return (
              <div key={log.id} className="rounded-xl p-3"
                style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: "rgba(38,37,30,0.08)", color: "rgba(38,37,30,0.7)" }}>
                      {log.module}
                    </span>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "rgba(38,37,30,0.5)" }}>
                    {formatDate(log.created_at)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#26251e" }}>{log.message}</p>
                {log.account_id && (
                  <p className="text-xs mt-1" style={{ color: "rgba(38,37,30,0.5)" }}>{log.account_id}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
