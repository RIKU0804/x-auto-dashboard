"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  name: string;
  genre: string;
  x_username: string;
  x_password: string;
  keywords: string[];
  is_active: boolean;
};

const inputStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  padding: "8px 12px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

export default function AccountsClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const reload = async () => {
    const { data } = await supabase.from("x_accounts").select("*").order("created_at");
    setAccounts(data ?? []);
  };

  const toggleActive = async (account: Account) => {
    await supabase.from("x_accounts").update({ is_active: !account.is_active }).eq("id", account.id);
    setAccounts((prev) => prev.map((a) => a.id === account.id ? { ...a, is_active: !a.is_active } : a));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      genre: form.get("genre") as string,
      x_username: form.get("x_username") as string,
      x_password: form.get("x_password") as string,
      keywords: (form.get("keywords") as string).split(",").map((k) => k.trim()).filter(Boolean),
      is_active: true,
    };

    try {
      if (editTarget) {
        const update: Partial<typeof data & { x_password?: string }> = { ...data };
        if (!data.x_password) delete update.x_password;
        await supabase.from("x_accounts").update(update).eq("id", editTarget.id);
      } else {
        const id = `account_${Date.now()}`;
        await supabase.from("x_accounts").insert({ id, ...data });
      }
      await reload();
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-base">アカウント管理</h1>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="text-sm px-4 py-2 rounded-lg font-medium"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          + 追加
        </button>
      </div>

      {accounts.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          アカウントがありません
        </p>
      )}

      {accounts.map((account) => (
        <div key={account.id} className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-sm">{account.name}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {account.x_username} · {account.genre}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive(account)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{
                  background: account.is_active ? "rgba(22,163,74,0.1)" : "rgba(207,45,86,0.08)",
                  color: account.is_active ? "var(--success)" : "var(--danger)",
                }}
              >
                {account.is_active ? "稼働中" : "停止中"}
              </button>
              <button
                onClick={() => { setEditTarget(account); setShowForm(true); }}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                編集
              </button>
            </div>
          </div>
          {account.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {account.keywords.map((k) => (
                <span key={k} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,78,0,0.08)", color: "var(--accent)" }}>
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditTarget(null); } }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <h2 className="font-semibold">{editTarget ? "アカウント編集" : "アカウント追加"}</h2>
            {error && (
              <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(207,45,86,0.08)", color: "var(--danger)" }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-3">
              {[
                { name: "name", label: "表示名", placeholder: "さくら", required: true },
                { name: "genre", label: "ジャンル", placeholder: "恋愛・日常", required: true },
                { name: "x_username", label: "Xユーザー名", placeholder: "@xxxx", required: true },
                { name: "x_password", label: editTarget ? "Xパスワード（変更時のみ）" : "Xパスワード", placeholder: editTarget ? "変更しない場合は空欄" : "パスワード", required: !editTarget },
                { name: "keywords", label: "キーワード（カンマ区切り）", placeholder: "恋愛, 片思い, 日常", required: true },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {f.label}
                  </label>
                  <input
                    name={f.name}
                    type={f.name.includes("password") ? "password" : "text"}
                    required={f.required}
                    placeholder={f.placeholder}
                    defaultValue={editTarget && f.name !== "x_password"
                      ? f.name === "keywords" ? (editTarget.keywords ?? []).join(", ") : (editTarget as Record<string, string>)[f.name]
                      : ""}
                    style={inputStyle}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setEditTarget(null); }}
                  className="flex-1 rounded-lg py-2.5 text-sm"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  キャンセル
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--text)", color: "var(--bg)" }}>
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
