"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("メールアドレスまたはパスワードが間違っています");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const s = {
    input: {
      background: "transparent",
      border: "1px solid var(--border)",
      borderRadius: 8,
      color: "var(--text)",
      padding: "10px 12px",
      fontSize: 14,
      width: "100%",
      outline: "none",
    } as React.CSSProperties,
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>X Auto</div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>管理ダッシュボード</div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="rounded-lg p-3 text-sm text-center" style={{ background: "rgba(207,45,86,0.08)", color: "var(--danger)" }}>
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              メールアドレス
            </label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={s.input} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              パスワード
            </label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={s.input} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
