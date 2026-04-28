"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftRow, AccountSummary } from "./page";

type Action = "approve" | "regenerate" | "delete" | null;

interface DraftsClientProps {
  drafts: DraftRow[];
  accounts: AccountSummary[];
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${hh}:${mm}`;
}

const statusColor = "#92400e";
const statusBg = "#fef3c7";

export default function DraftsClient({ drafts, accounts }: DraftsClientProps) {
  const router = useRouter();
  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) map.set(a.id, a.name ?? a.id);
    return map;
  }, [accounts]);

  // Local optimistic state per row
  const [localText, setLocalText] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, Action>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const setRowError = (id: string, msg: string | null) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[id] = msg;
      else delete next[id];
      return next;
    });

  const setRowBusy = (id: string, action: Action) =>
    setBusy((prev) => ({ ...prev, [id]: action }));

  const grouped = useMemo(() => {
    const groups = new Map<string, DraftRow[]>();
    for (const d of drafts) {
      if (hidden[d.id]) continue;
      const key = d.account_id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    }
    return Array.from(groups.entries());
  }, [drafts, hidden]);

  const visibleCount = drafts.filter((d) => !hidden[d.id]).length;

  async function handleApprove(d: DraftRow) {
    setRowBusy(d.id, "approve");
    setRowError(d.id, null);
    try {
      const text = localText[d.id] ?? d.post_text;
      const res = await fetch(`/api/posts/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "queued", approved: true, post_text: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `承認に失敗しました (${res.status})`);
      }
      setHidden((prev) => ({ ...prev, [d.id]: true }));
      router.refresh();
    } catch (err: unknown) {
      setRowError(d.id, err instanceof Error ? err.message : "承認に失敗しました");
    } finally {
      setRowBusy(d.id, null);
    }
  }

  async function handleRegenerate(d: DraftRow) {
    setRowBusy(d.id, "regenerate");
    setRowError(d.id, null);
    try {
      const res = await fetch(`/api/posts/${d.id}/regenerate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `再生成に失敗しました (${res.status})`);
      }
      const data = await res.json();
      const newText: string | undefined = data?.post_text ?? data?.data?.post_text;
      if (typeof newText === "string") {
        setLocalText((prev) => ({ ...prev, [d.id]: newText }));
      }
      router.refresh();
    } catch (err: unknown) {
      setRowError(d.id, err instanceof Error ? err.message : "再生成に失敗しました");
    } finally {
      setRowBusy(d.id, null);
    }
  }

  async function handleDelete(d: DraftRow) {
    if (!confirm("この下書きを削除しますか？")) return;
    setRowBusy(d.id, "delete");
    setRowError(d.id, null);
    try {
      const res = await fetch(`/api/posts/${d.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `削除に失敗しました (${res.status})`);
      }
      setHidden((prev) => ({ ...prev, [d.id]: true }));
      router.refresh();
    } catch (err: unknown) {
      setRowError(d.id, err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setRowBusy(d.id, null);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#26251e" }}>
          下書き
        </h1>
        <span className="text-xs" style={{ color: "rgba(38,37,30,0.55)" }}>
          {visibleCount}件
        </span>
      </div>

      {visibleCount === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: "rgba(38,37,30,0.45)" }}>
          下書きはありません
        </p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([accountId, rows]) => (
            <section key={accountId} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: "#26251e",
                    color: "#f2f1ed",
                  }}
                >
                  {accountNameById.get(accountId) ?? accountId}
                </span>
                <span className="text-xs" style={{ color: "rgba(38,37,30,0.5)" }}>
                  {rows.length}件
                </span>
              </div>
              <div className="space-y-2">
                {rows.map((d) => {
                  const text = localText[d.id] ?? d.post_text;
                  const isEditing = !!editing[d.id];
                  const action = busy[d.id] ?? null;
                  const errMsg = errors[d.id];
                  const disabled = action !== null;
                  return (
                    <div
                      key={d.id}
                      className="rounded-xl p-4 space-y-3"
                      style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="text-xs font-medium break-all"
                          style={{ color: "rgba(38,37,30,0.55)" }}
                        >
                          {d.cycle === "morning" ? "🌅 朝" : d.cycle === "night" ? "🌙 夜" : "—"}
                          {" · "}
                          {formatDateTime(d.created_at)}
                          {d.scheduled_for ? ` · 予定 ${d.scheduled_for}` : ""}
                        </span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: statusBg, color: statusColor }}
                        >
                          下書き
                        </span>
                      </div>

                      {isEditing ? (
                        <textarea
                          value={text}
                          onChange={(e) =>
                            setLocalText((prev) => ({ ...prev, [d.id]: e.target.value }))
                          }
                          onBlur={() => setEditing((prev) => ({ ...prev, [d.id]: false }))}
                          autoFocus
                          rows={4}
                          maxLength={280}
                          className="w-full text-sm leading-relaxed rounded-md p-2 resize-y"
                          style={{
                            background: "#f2f1ed",
                            border: "1px solid rgba(38,37,30,0.18)",
                            color: "#26251e",
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing((prev) => ({ ...prev, [d.id]: true }))}
                          className="block w-full text-left text-sm leading-relaxed break-words rounded-md p-2 cursor-text hover:bg-[rgba(255,255,255,0.4)]"
                          style={{ color: "#26251e" }}
                          title="クリックで編集"
                        >
                          {text || (
                            <span style={{ color: "rgba(38,37,30,0.4)" }}>（本文なし）</span>
                          )}
                        </button>
                      )}

                      <div className="text-[10px] text-right" style={{ color: "rgba(38,37,30,0.45)" }}>
                        {text.length} / 280
                      </div>

                      {errMsg && (
                        <p className="text-xs break-words" style={{ color: "#b91c1c" }}>
                          {errMsg}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleApprove(d)}
                          className="text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-50 hover:opacity-90"
                          style={{ background: "#15803d", color: "#f2f1ed" }}
                        >
                          {action === "approve" ? "承認中…" : "承認"}
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleRegenerate(d)}
                          className="text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-50 hover:opacity-90"
                          style={{
                            background: "#f2f1ed",
                            color: "#26251e",
                            border: "1px solid rgba(38,37,30,0.18)",
                          }}
                        >
                          {action === "regenerate" ? "生成中…" : "再生成"}
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleDelete(d)}
                          className="text-sm font-medium px-3 py-1.5 rounded-md disabled:opacity-50 hover:opacity-90 ml-auto"
                          style={{
                            background: "transparent",
                            color: "#b91c1c",
                            border: "1px solid rgba(185,28,28,0.4)",
                          }}
                        >
                          {action === "delete" ? "削除中…" : "削除"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
