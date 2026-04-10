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

  const colors = {
    idle: { bg: "var(--text)", color: "var(--bg)" },
    loading: { bg: "var(--surface)", color: "var(--text-muted)" },
    done: { bg: "rgba(22,163,74,0.12)", color: "var(--success)" },
    error: { bg: "rgba(207,45,86,0.1)", color: "var(--danger)" },
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
      className="w-full rounded-lg py-2.5 text-sm font-medium transition-all disabled:opacity-60"
      style={colors[state]}
    >
      {labels[state]}
    </button>
  );
}
