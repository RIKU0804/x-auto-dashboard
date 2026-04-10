"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Persona = {
  name: string;
  age: number | string;
  occupation: string;
  personality: string;
  hobbies: string;
  preferred_male_type: string;
  values: string;
  tone: string;
  post_style: string;
};

type Account = {
  id: string;
  name: string;
  genre: string;
  x_username: string;
  x_password: string;
  keywords: string[];
  persona: Persona | null;
  is_active: boolean;
};

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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 64,
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "rgba(38,37,30,0.55)" }}>
    {children}
  </label>
);

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

    const persona: Persona = {
      name: form.get("persona_name") as string,
      age: Number(form.get("persona_age")) || 22,
      occupation: form.get("persona_occupation") as string,
      personality: form.get("persona_personality") as string,
      hobbies: form.get("persona_hobbies") as string,
      preferred_male_type: form.get("persona_preferred_male_type") as string,
      values: form.get("persona_values") as string,
      tone: form.get("persona_tone") as string,
      post_style: form.get("persona_post_style") as string,
    };

    const data: Record<string, unknown> = {
      name: form.get("name") as string,
      genre: form.get("genre") as string,
      x_username: form.get("x_username") as string,
      keywords: (form.get("keywords") as string).split(",").map((k) => k.trim()).filter(Boolean),
      persona,
      is_active: true,
    };
    const pw = form.get("x_password") as string;
    if (pw) data.x_password = pw;

    try {
      if (editTarget) {
        await supabase.from("x_accounts").update(data).eq("id", editTarget.id);
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

  const p = editTarget?.persona;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#26251e" }}>Xアカウント管理</h1>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="text-sm px-4 py-2 rounded-lg font-semibold"
          style={{ background: "#26251e", color: "#f2f1ed" }}
        >
          + 追加
        </button>
      </div>

      {accounts.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: "rgba(38,37,30,0.45)" }}>アカウントがありません</p>
      )}

      {accounts.map((account) => (
        <div key={account.id} className="rounded-xl p-4 space-y-3"
          style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-sm" style={{ color: "#26251e" }}>{account.name}</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(38,37,30,0.55)" }}>
                {account.x_username} · {account.genre}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(account)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{
                  background: account.is_active ? "#dcfce7" : "#fee2e2",
                  color: account.is_active ? "#15803d" : "#b91c1c",
                }}>
                {account.is_active ? "稼働中" : "停止中"}
              </button>
              <button onClick={() => { setEditTarget(account); setShowForm(true); }}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ border: "1px solid rgba(38,37,30,0.15)", color: "rgba(38,37,30,0.7)" }}>
                編集
              </button>
            </div>
          </div>

          {account.persona && (
            <div className="rounded-lg p-3 space-y-1" style={{ background: "rgba(38,37,30,0.05)" }}>
              <div className="text-xs font-semibold" style={{ color: "rgba(38,37,30,0.55)" }}>ペルソナ</div>
              <div className="text-sm" style={{ color: "#26251e" }}>
                {account.persona.name} / {account.persona.age}歳 / {account.persona.occupation}
              </div>
              <div className="text-xs" style={{ color: "rgba(38,37,30,0.6)" }}>{account.persona.tone}</div>
            </div>
          )}

          {account.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {account.keywords.map((k) => (
                <span key={k} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,78,0,0.08)", color: "#f54e00" }}>
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditTarget(null); } }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5 my-8"
            style={{ background: "#f2f1ed", border: "1px solid rgba(38,37,30,0.12)" }}>
            <h2 className="font-bold text-lg" style={{ color: "#26251e" }}>
              {editTarget ? "アカウント編集" : "アカウント追加"}
            </h2>

            {error && (
              <div className="rounded-lg p-3 text-sm" style={{ background: "#fee2e2", color: "#b91c1c" }}>{error}</div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              {/* Basic info */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(38,37,30,0.4)" }}>基本情報</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>表示名</Label>
                    <input name="name" required placeholder="さくら" defaultValue={editTarget?.name ?? ""} style={inputStyle} />
                  </div>
                  <div>
                    <Label>ジャンル</Label>
                    <input name="genre" required placeholder="恋愛・日常" defaultValue={editTarget?.genre ?? ""} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Xユーザー名</Label>
                    <input name="x_username" required placeholder="@xxxx" defaultValue={editTarget?.x_username ?? ""} style={inputStyle} />
                  </div>
                  <div>
                    <Label>Xパスワード{editTarget ? "（変更時のみ）" : ""}</Label>
                    <input name="x_password" type="password" required={!editTarget}
                      placeholder={editTarget ? "変更しない場合は空欄" : "パスワード"} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <Label>キーワード（カンマ区切り）</Label>
                  <input name="keywords" required placeholder="恋愛, 片思い, 日常, カフェ"
                    defaultValue={(editTarget?.keywords ?? []).join(", ")} style={inputStyle} />
                </div>
              </div>

              {/* Persona */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(38,37,30,0.4)" }}>ペルソナ設定</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>名前</Label>
                    <input name="persona_name" placeholder="さくら" defaultValue={p?.name ?? ""} style={inputStyle} />
                  </div>
                  <div>
                    <Label>年齢</Label>
                    <input name="persona_age" type="number" placeholder="22" defaultValue={p?.age ?? 22} style={inputStyle} />
                  </div>
                  <div>
                    <Label>職業</Label>
                    <input name="persona_occupation" placeholder="カフェ店員" defaultValue={p?.occupation ?? ""} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <Label>性格</Label>
                  <input name="persona_personality" placeholder="おしとやか・照れ屋・年上好き" defaultValue={p?.personality ?? ""} style={inputStyle} />
                </div>
                <div>
                  <Label>趣味（カンマ区切り）</Label>
                  <input name="persona_hobbies" placeholder="読書, 料理, 映画鑑賞"
                    defaultValue={Array.isArray(p?.hobbies) ? (p.hobbies as string[]).join(", ") : (p?.hobbies ?? "")} style={inputStyle} />
                </div>
                <div>
                  <Label>好きな男性像</Label>
                  <input name="persona_preferred_male_type" placeholder="落ち着いた40〜60代の男性" defaultValue={p?.preferred_male_type ?? ""} style={inputStyle} />
                </div>
                <div>
                  <Label>価値観</Label>
                  <textarea name="persona_values" placeholder="年上の男性の余裕や包容力に惹かれる..." defaultValue={p?.values ?? ""} style={textareaStyle} />
                </div>
                <div>
                  <Label>話し方</Label>
                  <textarea name="persona_tone" placeholder="やわらかく少し恥ずかしそうな話し方..." defaultValue={p?.tone ?? ""} style={textareaStyle} />
                </div>
                <div>
                  <Label>投稿スタイル</Label>
                  <textarea name="persona_post_style" placeholder="日常のふとした瞬間をつぶやく..." defaultValue={p?.post_style ?? ""} style={textareaStyle} />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setEditTarget(null); }}
                  className="flex-1 rounded-lg py-2.5 text-sm font-medium"
                  style={{ border: "1px solid rgba(38,37,30,0.15)", color: "rgba(38,37,30,0.7)" }}>
                  キャンセル
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
                  style={{ background: "#26251e", color: "#f2f1ed" }}>
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
