"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  name: string;
  genre: string;
};

type Cycle = "morning" | "night";

interface ComposerClientProps {
  accounts: Account[];
}

const MAX_CHARS = 280;

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(38,37,30,0.18)",
  borderRadius: 8,
  padding: "10px 12px",
  background: "white",
  color: "#26251e",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 140,
  fontFamily: "inherit",
  lineHeight: 1.6,
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label
    className="block text-xs font-semibold mb-1 uppercase tracking-wide"
    style={{ color: "rgba(38,37,30,0.55)" }}
  >
    {children}
  </label>
);

export default function ComposerClient({ accounts }: ComposerClientProps) {
  const router = useRouter();

  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [cycle, setCycle] = useState<Cycle>("morning");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [postText, setPostText] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState<"draft" | "queued" | null>(null);
  const [error, setError] = useState<string>("");

  const charCount = postText.length;
  const overLimit = charCount > MAX_CHARS;

  const noAccounts = accounts.length === 0;
  const canSubmit = useMemo(
    () =>
      !noAccounts &&
      !!accountId &&
      postText.trim().length > 0 &&
      !overLimit &&
      submitting === null,
    [noAccounts, accountId, postText, overLimit, submitting],
  );

  const handleGenerate = async () => {
    if (!accountId || generating) return;
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/posts/generate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "AI生成に失敗しました");
      }
      const json = await res.json();
      const generated = json?.post_text ?? json?.data?.post_text ?? "";
      if (typeof generated !== "string" || generated.length === 0) {
        throw new Error("AIから本文が返却されませんでした");
      }
      setPostText(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const submit = async (mode: "draft" | "queued") => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(mode);

    const payload: Record<string, unknown> = {
      account_id: accountId,
      cycle,
      post_text: postText,
      scheduled_for: scheduledFor || null,
      status: mode,
    };
    if (mode === "queued") payload.approved = true;

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "保存に失敗しました");
      }
      router.push(mode === "draft" ? "/drafts" : "/posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#26251e" }}>
        新規投稿
      </h1>

      {noAccounts && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{ background: "#fef3c7", color: "#92400e" }}
        >
          稼働中のアカウントがありません。先にアカウントを追加・有効化してください。
        </div>
      )}

      <div
        className="rounded-xl p-5 space-y-5"
        style={{
          background: "#ebeae5",
          border: "1px solid rgba(38,37,30,0.12)",
        }}
      >
        {/* Account */}
        <div>
          <Label>アカウント</Label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={noAccounts}
            style={inputStyle}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}（{a.genre}）
              </option>
            ))}
          </select>
        </div>

        {/* Cycle toggle */}
        <div>
          <Label>サイクル</Label>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: "morning", label: "🌅 朝サイクル" },
              { value: "night", label: "🌙 夜サイクル" },
            ] as const).map((opt) => {
              const active = cycle === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCycle(opt.value)}
                  className="rounded-lg py-2.5 text-sm font-semibold transition-colors"
                  style={{
                    background: active ? "#26251e" : "white",
                    color: active ? "#f2f1ed" : "#26251e",
                    border: "1px solid rgba(38,37,30,0.18)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scheduled date */}
        <div>
          <Label>投稿予定日 / 任意 — 未指定なら次回サイクル</Label>
          <input
            type="date"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Post text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>本文</Label>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!accountId || generating || noAccounts}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
              style={{
                background: "#26251e",
                color: "#f2f1ed",
              }}
            >
              {generating ? "生成中..." : "AIで生成"}
            </button>
          </div>
          <textarea
            rows={5}
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="投稿する本文を入力してください"
            style={textareaStyle}
          />
          <div
            className="text-xs text-right font-medium"
            style={{ color: overLimit ? "#b91c1c" : "rgba(38,37,30,0.55)" }}
          >
            {charCount} / {MAX_CHARS}
          </div>
        </div>

        {/* Submit buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => submit("draft")}
            disabled={!canSubmit}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ background: "#ebeae5", color: "#26251e", border: "1px solid rgba(38,37,30,0.18)" }}
          >
            {submitting === "draft" ? "保存中..." : "下書き保存"}
          </button>
          <button
            type="button"
            onClick={() => submit("queued")}
            disabled={!canSubmit}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ background: "#26251e", color: "white" }}
          >
            {submitting === "queued" ? "予約中..." : "予約投稿"}
          </button>
        </div>

        {error && (
          <p className="text-sm" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
