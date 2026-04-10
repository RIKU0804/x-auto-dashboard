"use client";
import { useState } from "react";

export default function RunButton({ cycle, label }: { cycle: "morning" | "night"; label: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleClick = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 3000);
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
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-60"
      style={styles[state]}
    >
      {labels[state]}
    </button>
  );
}
