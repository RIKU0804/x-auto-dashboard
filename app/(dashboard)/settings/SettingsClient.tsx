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

const MODELS = [
  { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5（推奨・激安）" },
  { value: "google/gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite（最安）" },
  { value: "deepseek/deepseek-chat", label: "DeepSeek Chat（安・高品質）" },
  { value: "moonshotai/moonshot-v1-8k", label: "Kimi（Moonshot v1 8k）" },
  { value: "moonshotai/moonshot-v1-32k", label: "Kimi（Moonshot v1 32k）" },
  { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku（高品質）" },
  { value: "custom", label: "カスタム入力..." },
];

export default function SettingsClient({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [webhook, setWebhook] = useState(initialSettings["discord_webhook_url"] ?? "");
  const savedModel = initialSettings["openrouter_model"] ?? "google/gemini-flash-1.5";
  const isKnownModel = MODELS.some((m) => m.value === savedModel && m.value !== "custom");
  const [model, setModel] = useState(isKnownModel ? savedModel : "custom");
  const [customModel, setCustomModel] = useState(isKnownModel ? "" : savedModel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const finalModel = model === "custom" ? customModel.trim() : model;
    const { error: err } = await supabase.from("x_settings").upsert([
      { key: "discord_webhook_url", value: webhook },
      { key: "openrouter_model", value: finalModel },
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

        <div className="rounded-xl p-5 space-y-4"
          style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}>
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(38,37,30,0.4)" }}>
            AI モデル設定
          </div>
          <div>
            <Label>使用モデル（OpenRouter）</Label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {model === "custom" && (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="例: moonshotai/moonshot-v1-8k"
                style={{ ...inputStyle, marginTop: 8 }}
              />
            )}
            <p className="text-xs mt-1.5" style={{ color: "rgba(38,37,30,0.45)" }}>
              トレンド分析・投稿生成の両方に使用されます。OpenRouterのモデルIDを入力してください。
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
    </div>
  );
}
