"use client";
import { useState } from "react";

export default function RunButton({ cycle, label }: { cycle: "morning" | "night"; label: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const handleClick = async () => {
    setState("loading");
    setErrMsg("");
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle }),
      });
      if (res.ok) {
        setState("done");
      } else {
        const json = await res.json().catch(() => ({}));
        setErrMsg(json.error ?? `HTTP ${res.status}`);
        setState("error");
      }
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "ネットワークエラー");
      setState("error");
    }
    setTimeout(() => setState("idle"), 5000);
  };

  const styles: Record<string, React.CSSProperties> = {
    idle:    { background: "#26251e", color: "#f2f1ed" },
    loading: { background: "#d5d4cf", color: "#26251e" },
    done:    { background: "#dcfce7", color: "#15803d" },
    error:   { background: "#fee2e2", color: "#b91c1c" },
  };

  const labels = {
    idle: label,
    loading: "実行中...",
    done: "✓ 開始しました",
    error: "エラー発生",
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-60"
        style={styles[state]}
      >
        {labels[state]}
      </button>
      {state === "error" && errMsg && (
        <p className="text-xs text-center" style={{ color: "#b91c1c" }}>{errMsg}</p>
      )}
    </div>
  );
}
