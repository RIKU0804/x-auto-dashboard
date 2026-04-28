"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(38,37,30,0.15)",
  borderRadius: 8,
  color: "#26251e",
  padding: "8px 12px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "rgba(38,37,30,0.55)" }}>
    {children}
  </label>
);

interface SettingsClientProps {
  initialSettings: Record<string, string>;
  initialAutoApprove?: string;
  initialMorningTime?: string;
  initialNightTime?: string;
}

async function patchSetting(key: string, value: string): Promise<void> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Failed to update ${key}`);
  }
}

export default function SettingsClient({
  initialSettings,
  initialAutoApprove = "false",
  initialMorningTime = "07:00",
  initialNightTime = "20:00",
}: SettingsClientProps) {
  const [webhook, setWebhook] = useState(initialSettings["discord_webhook_url"] ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [autoApprove, setAutoApprove] = useState(initialAutoApprove === "true");
  const [morningTime, setMorningTime] = useState(initialMorningTime);
  const [nightTime, setNightTime] = useState(initialNightTime);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const flashScheduleSaved = () => {
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 2000);
  };

  const handleAutoApproveChange = async (next: boolean) => {
    setAutoApprove(next);
    setError("");
    try {
      await patchSetting("auto_approve", next ? "true" : "false");
      flashScheduleSaved();
    } catch (e: unknown) {
      setAutoApprove(!next);
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  const handleTimeBlur = async (key: "morning_time" | "night_time", value: string) => {
    setError("");
    try {
      await patchSetting(key, value);
      flashScheduleSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const { error: err } = await supabase.from("x_settings").upsert([
      { key: "discord_webhook_url", value: webhook },
    ]);

    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#26251e" }}>設定</h1>

      {error && (
        <div className="rounded-lg p-3 text-sm" style={{ background: "#fee2e2", color: "#b91c1c" }}>{error}</div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="rounded-xl p-5 space-y-4"
          style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}>
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(38,37,30,0.4)" }}>
            通知設定
          </div>
          <div>
            <Label>Discord Webhook URL</Label>
            <input
              type="url"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              style={inputStyle}
            />
            <p className="text-xs mt-1.5" style={{ color: "rgba(38,37,30,0.45)" }}>
              Discord サーバー設定 → 連携サービス → ウェブフック から取得できます
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{
            background: saved ? "#dcfce7" : "#26251e",
            color: saved ? "#15803d" : "#f2f1ed",
          }}
        >
          {saving ? "保存中..." : saved ? "✓ 保存しました" : "保存"}
        </button>
      </form>

      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(38,37,30,0.4)" }}>
            投稿スケジュール
          </div>
          {scheduleSaved && (
            <span className="text-xs font-semibold" style={{ color: "#15803d" }}>
              ✓ 保存しました
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: "#26251e" }}>
              AI生成を自動承認する
            </div>
            <p className="text-xs mt-1" style={{ color: "rgba(38,37,30,0.55)" }}>
              オンの場合、生成された投稿は自動的に承認され、次サイクルで投稿されます。
              オフの場合は下書きとして保存され、手動承認が必要です。
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoApprove}
            onClick={() => handleAutoApproveChange(!autoApprove)}
            className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
            style={{
              background: autoApprove ? "#26251e" : "rgba(38,37,30,0.2)",
            }}
          >
            <span
              className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
              style={{
                transform: autoApprove ? "translateX(22px)" : "translateX(2px)",
              }}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>朝サイクル時刻</Label>
            <input
              type="time"
              value={morningTime}
              onChange={(e) => setMorningTime(e.target.value)}
              onBlur={(e) => handleTimeBlur("morning_time", e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <Label>夜サイクル時刻</Label>
            <input
              type="time"
              value={nightTime}
              onChange={(e) => setNightTime(e.target.value)}
              onBlur={(e) => handleTimeBlur("night_time", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <p className="text-xs" style={{ color: "rgba(38,37,30,0.45)" }}>
          ※ GitHub Actions の cron は固定です。この設定は表示用です。
        </p>
      </div>
    </div>
  );
}
