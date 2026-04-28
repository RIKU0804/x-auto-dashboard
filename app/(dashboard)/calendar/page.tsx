import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  account_id: string;
  post_text: string;
  status: "draft" | "queued" | "posted" | "failed";
  cycle: "morning" | "night" | null;
  scheduled_for: string | null;
  posted_at: string | null;
  created_at: string;
  error_message: string | null;
};

const statusColor = (s: string) =>
  s === "posted" ? "#15803d" : s === "failed" ? "#b91c1c" : "#92400e";
const statusBg = (s: string) =>
  s === "posted" ? "#dcfce7" : s === "failed" ? "#fee2e2" : "#fef3c7";
const statusLabel = (s: string) =>
  s === "posted" ? "投稿済" : s === "failed" ? "失敗" : s === "draft" ? "下書き" : "待機中";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function ym(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function parseMonth(value: string | undefined): { year: number; month: number } {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(year, month + delta, 1);
  return ym(d);
}

function getPostDate(p: PostRow): string {
  return p.scheduled_for ?? p.created_at.slice(0, 10);
}

function buildQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; account?: string; day?: string }>;
}) {
  const sp = await searchParams;
  const { year, month } = parseMonth(sp.month);
  const accountFilter = sp.account ?? "";
  const selectedDay = sp.day ?? "";

  const supabase = await createClient();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const startStr = ymd(monthStart);
  const endStr = ymd(monthEnd);

  const [{ data: accounts }, { data: postsRaw }] = await Promise.all([
    supabase.from("x_accounts").select("id, name").order("created_at"),
    supabase
      .from("x_posts")
      .select(
        "id, account_id, post_text, status, cycle, scheduled_for, posted_at, created_at, error_message",
      )
      .or(
        `and(scheduled_for.gte.${startStr},scheduled_for.lte.${endStr}),and(scheduled_for.is.null,created_at.gte.${startStr}T00:00:00,created_at.lte.${endStr}T23:59:59)`,
      )
      .order("created_at", { ascending: true }),
  ]);

  const posts: PostRow[] = (postsRaw ?? []) as PostRow[];
  const filteredPosts = accountFilter
    ? posts.filter((p) => p.account_id === accountFilter)
    : posts;

  const byDate = new Map<string, PostRow[]>();
  for (const p of filteredPosts) {
    const key = getPostDate(p);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(p);
  }

  const firstDow = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;
  const cells: ({ date: string; day: number; inMonth: boolean } | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - firstDow;
    const cellDate = new Date(year, month, dayOffset + 1);
    const inMonth = cellDate.getMonth() === month;
    cells.push({
      date: ymd(cellDate),
      day: cellDate.getDate(),
      inMonth,
    });
  }

  const todayStr = ymd(new Date());
  const monthLabel = `${year}年${month + 1}月`;
  const prevMonth = shiftMonth(year, month, -1);
  const nextMonth = shiftMonth(year, month, 1);
  const todayMonth = ym(new Date());

  const baseParams: Record<string, string | undefined> = {
    account: accountFilter || undefined,
  };

  const selectedDayPosts = selectedDay ? byDate.get(selectedDay) ?? [] : [];

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#26251e" }}>
        カレンダー
      </h1>

      {/* Controls */}
      <div
        className="rounded-xl p-4 flex flex-wrap items-center gap-3"
        style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}
      >
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar${buildQuery({ ...baseParams, month: prevMonth })}`}
            className="text-sm px-3 py-1.5 rounded-md font-medium hover:opacity-80"
            style={{ background: "#f2f1ed", border: "1px solid rgba(38,37,30,0.12)", color: "#26251e" }}
          >
            ← 前月
          </Link>
          <Link
            href={`/calendar${buildQuery({ ...baseParams, month: todayMonth })}`}
            className="text-sm px-3 py-1.5 rounded-md font-medium hover:opacity-80"
            style={{ background: "#f2f1ed", border: "1px solid rgba(38,37,30,0.12)", color: "#26251e" }}
          >
            今月
          </Link>
          <Link
            href={`/calendar${buildQuery({ ...baseParams, month: nextMonth })}`}
            className="text-sm px-3 py-1.5 rounded-md font-medium hover:opacity-80"
            style={{ background: "#f2f1ed", border: "1px solid rgba(38,37,30,0.12)", color: "#26251e" }}
          >
            翌月 →
          </Link>
        </div>
        <div className="text-base font-semibold ml-2" style={{ color: "#26251e" }}>
          {monthLabel}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs" style={{ color: "rgba(38,37,30,0.6)" }}>
            アカウント
          </span>
          <form action="/calendar" method="get">
            <input type="hidden" name="month" value={ym(monthStart)} />
            <select
              name="account"
              defaultValue={accountFilter}
              className="text-sm px-2 py-1.5 rounded-md"
              style={{
                background: "#f2f1ed",
                border: "1px solid rgba(38,37,30,0.12)",
                color: "#26251e",
              }}
            >
              <option value="">すべて</option>
              {(accounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name ?? a.id}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="text-sm px-3 py-1.5 ml-2 rounded-md font-medium hover:opacity-80"
              style={{
                background: "#26251e",
                color: "#f2f1ed",
              }}
            >
              適用
            </button>
          </form>
        </div>
      </div>

      {/* Month grid */}
      <div
        className="rounded-xl p-3"
        style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}
      >
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className="text-xs font-semibold text-center py-1"
              style={{
                color: i === 0 ? "#b91c1c" : i === 6 ? "#1d4ed8" : "rgba(38,37,30,0.6)",
              }}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={idx} />;
            const dayPosts = byDate.get(cell.date) ?? [];
            const visible = dayPosts.slice(0, 3);
            const overflow = dayPosts.length - visible.length;
            const isToday = cell.date === todayStr;
            const isSelected = cell.date === selectedDay;
            const dow = idx % 7;
            return (
              <Link
                key={cell.date}
                href={`/calendar${buildQuery({ ...baseParams, month: ym(monthStart), day: cell.date })}`}
                className="block rounded-lg p-1.5 min-h-[84px] hover:opacity-90 transition-opacity"
                style={{
                  background: isSelected ? "#26251e" : cell.inMonth ? "#f2f1ed" : "rgba(242,241,237,0.45)",
                  border: isToday
                    ? "1.5px solid #f54e00"
                    : "1px solid rgba(38,37,30,0.08)",
                  opacity: cell.inMonth ? 1 : 0.5,
                }}
              >
                <div
                  className="text-xs font-semibold mb-1"
                  style={{
                    color: isSelected
                      ? "#f2f1ed"
                      : dow === 0
                        ? "#b91c1c"
                        : dow === 6
                          ? "#1d4ed8"
                          : "#26251e",
                  }}
                >
                  {cell.day}
                </div>
                <div className="space-y-0.5">
                  {visible.map((p) => (
                    <div
                      key={p.id}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate"
                      style={{
                        background: statusBg(p.status),
                        color: statusColor(p.status),
                      }}
                      title={p.post_text}
                    >
                      {p.cycle === "morning" ? "🌅" : p.cycle === "night" ? "🌙" : "•"} {p.post_text.slice(0, 12)}
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div
                      className="text-[10px] font-medium"
                      style={{ color: isSelected ? "#f2f1ed" : "rgba(38,37,30,0.55)" }}
                    >
                      +{overflow}件
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Selected day list */}
      {selectedDay && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: "#26251e" }}>
              {selectedDay} の投稿（{selectedDayPosts.length}件）
            </h2>
            <Link
              href={`/calendar${buildQuery({ ...baseParams, month: ym(monthStart) })}`}
              className="text-xs"
              style={{ color: "rgba(38,37,30,0.55)" }}
            >
              閉じる
            </Link>
          </div>
          {selectedDayPosts.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "rgba(38,37,30,0.45)" }}>
              この日の投稿はありません
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDayPosts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl p-4"
                  style={{ background: "#ebeae5", border: "1px solid rgba(38,37,30,0.12)" }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-medium break-all" style={{ color: "rgba(38,37,30,0.55)" }}>
                      {p.account_id} · {p.cycle === "morning" ? "🌅 朝" : p.cycle === "night" ? "🌙 夜" : ""}
                      {p.posted_at ? ` · ${formatTime(p.posted_at)}` : ""}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: statusBg(p.status), color: statusColor(p.status) }}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed break-words" style={{ color: "#26251e" }}>
                    {p.post_text}
                  </p>
                  {p.error_message && (
                    <p className="text-xs mt-2 break-words" style={{ color: "#b91c1c" }}>
                      {p.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
