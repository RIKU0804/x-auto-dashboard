import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Range = "7d" | "30d" | "90d";

const RANGE_DAYS: Record<Range, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const RANGE_LABEL: Record<Range, string> = {
  "7d": "7日",
  "30d": "30日",
  "90d": "90日",
};

const COLOR_POSTED = "#15803d";
const COLOR_FAILED = "#b91c1c";
const COLOR_PRIMARY = "#26251e";
const SURFACE_BG = "#ebeae5";
const SURFACE_BORDER = "1px solid rgba(38,37,30,0.12)";
const TEXT_MUTED = "rgba(38,37,30,0.6)";
const GRID_COLOR = "rgba(38,37,30,0.12)";
const AXIS_COLOR = "rgba(38,37,30,0.45)";

interface PostRow {
  id: string;
  account_id: string;
  status: string;
  created_at: string;
}

interface AccountRow {
  id: string;
  name: string;
}

interface MetricRow {
  post_id: string;
  impressions: number | null;
  likes: number | null;
  retweets: number | null;
  replies: number | null;
  bookmarks: number | null;
}

interface DailyBucket {
  date: string;
  posted: number;
  failed: number;
}

interface AccountBucket {
  accountId: string;
  name: string;
  count: number;
}

function isRange(value: string | undefined): value is Range {
  return value === "7d" || value === "30d" || value === "90d";
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function buildDailySeries(posts: PostRow[], days: number): DailyBucket[] {
  const buckets: DailyBucket[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.push({ date: d.toISOString().slice(0, 10), posted: 0, failed: 0 });
  }
  const indexByDate = new Map(buckets.map((b, idx) => [b.date, idx] as const));
  for (const p of posts) {
    const day = new Date(p.created_at).toISOString().slice(0, 10);
    const idx = indexByDate.get(day);
    if (idx === undefined) continue;
    if (p.status === "posted") buckets[idx].posted += 1;
    else if (p.status === "failed") buckets[idx].failed += 1;
  }
  return buckets;
}

function buildAccountSeries(
  posts: PostRow[],
  accounts: AccountRow[],
): AccountBucket[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    counts.set(p.account_id, (counts.get(p.account_id) ?? 0) + 1);
  }
  const nameById = new Map(accounts.map((a) => [a.id, a.name] as const));
  const result: AccountBucket[] = [];
  for (const [accountId, count] of counts.entries()) {
    result.push({
      accountId,
      name: nameById.get(accountId) ?? accountId,
      count,
    });
  }
  return result.sort((a, b) => b.count - a.count);
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ background: SURFACE_BG, border: SURFACE_BORDER }}
    >
      <div
        className="text-3xl font-bold"
        style={{ color: COLOR_PRIMARY }}
      >
        {value}
      </div>
      <div
        className="text-xs mt-1 font-medium"
        style={{ color: TEXT_MUTED }}
      >
        {label}
      </div>
      {hint ? (
        <div
          className="text-[10px] mt-1"
          style={{ color: "rgba(38,37,30,0.45)" }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

const CHART_W = 800;
const CHART_H = 240;
const PAD = 40;

function LineChart({ data }: { data: DailyBucket[] }) {
  const innerW = CHART_W - PAD * 2;
  const innerH = CHART_H - PAD * 2;
  const maxY = Math.max(
    1,
    ...data.map((d) => Math.max(d.posted, d.failed)),
  );
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xAt = (i: number) => PAD + stepX * i;
  const yAt = (v: number) => PAD + innerH - (v / maxY) * innerH;
  const buildPath = (key: "posted" | "failed") =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(d[key])}`)
      .join(" ");
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const yTicks = 4;
  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      width="100%"
      role="img"
      aria-label="日別投稿数"
    >
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const y = PAD + (innerH / yTicks) * i;
        const v = Math.round(maxY - (maxY / yTicks) * i);
        return (
          <g key={`y-${i}`}>
            <line
              x1={PAD}
              x2={CHART_W - PAD}
              y1={y}
              y2={y}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
            <text
              x={PAD - 6}
              y={y + 4}
              fontSize={10}
              textAnchor="end"
              fill={AXIS_COLOR}
            >
              {v}
            </text>
          </g>
        );
      })}
      <path
        d={buildPath("posted")}
        fill="none"
        stroke={COLOR_POSTED}
        strokeWidth={2}
      />
      <path
        d={buildPath("failed")}
        fill="none"
        stroke={COLOR_FAILED}
        strokeWidth={2}
      />
      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={xAt(i)} cy={yAt(d.posted)} r={2.5} fill={COLOR_POSTED} />
          <circle cx={xAt(i)} cy={yAt(d.failed)} r={2.5} fill={COLOR_FAILED} />
          {i % labelEvery === 0 ? (
            <text
              x={xAt(i)}
              y={CHART_H - PAD + 16}
              fontSize={10}
              textAnchor="middle"
              fill={AXIS_COLOR}
            >
              {formatDayLabel(d.date)}
            </text>
          ) : null}
        </g>
      ))}
      <g transform={`translate(${PAD}, ${PAD - 18})`}>
        <circle cx={4} cy={0} r={4} fill={COLOR_POSTED} />
        <text x={12} y={3} fontSize={10} fill={COLOR_PRIMARY}>
          投稿成功
        </text>
        <circle cx={70} cy={0} r={4} fill={COLOR_FAILED} />
        <text x={78} y={3} fontSize={10} fill={COLOR_PRIMARY}>
          失敗
        </text>
      </g>
    </svg>
  );
}

function BarChart({ data }: { data: AccountBucket[] }) {
  const innerW = CHART_W - PAD * 2;
  const innerH = CHART_H - PAD * 2;
  const maxY = Math.max(1, ...data.map((d) => d.count));
  const slot = data.length > 0 ? innerW / data.length : innerW;
  const barW = Math.max(8, slot * 0.55);
  const yTicks = 4;
  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      width="100%"
      role="img"
      aria-label="アカウント別投稿数"
    >
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const y = PAD + (innerH / yTicks) * i;
        const v = Math.round(maxY - (maxY / yTicks) * i);
        return (
          <g key={`y-${i}`}>
            <line
              x1={PAD}
              x2={CHART_W - PAD}
              y1={y}
              y2={y}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
            <text
              x={PAD - 6}
              y={y + 4}
              fontSize={10}
              textAnchor="end"
              fill={AXIS_COLOR}
            >
              {v}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = PAD + slot * i + slot / 2;
        const h = (d.count / maxY) * innerH;
        const y = PAD + innerH - h;
        return (
          <g key={d.accountId}>
            <rect
              x={cx - barW / 2}
              y={y}
              width={barW}
              height={h}
              fill={COLOR_PRIMARY}
              rx={3}
            />
            <text
              x={cx}
              y={y - 4}
              fontSize={10}
              textAnchor="middle"
              fill={COLOR_PRIMARY}
            >
              {d.count}
            </text>
            <text
              x={cx}
              y={CHART_H - PAD + 16}
              fontSize={10}
              textAnchor="middle"
              fill={AXIS_COLOR}
            >
              {d.name.length > 10 ? `${d.name.slice(0, 10)}…` : d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div
      className="text-center text-sm py-12"
      style={{ color: TEXT_MUTED }}
    >
      {message}
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range: Range = isRange(params.range) ? params.range : "7d";
  const days = RANGE_DAYS[range];

  const supabase = await createClient();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const sinceIso = since.toISOString();

  const [
    { data: postsData },
    { data: accountsData },
    { data: metricsData },
  ] = await Promise.all([
    supabase
      .from("x_posts")
      .select("id, account_id, status, created_at")
      .gte("created_at", sinceIso),
    supabase.from("x_accounts").select("id, name"),
    supabase
      .from("x_post_metrics")
      .select(
        "post_id, impressions, likes, retweets, replies, bookmarks, x_posts!inner(created_at)",
      )
      .gte("x_posts.created_at", sinceIso),
  ]);

  const posts: PostRow[] = postsData ?? [];
  const accounts: AccountRow[] = accountsData ?? [];
  const metrics: MetricRow[] = (metricsData ?? []) as unknown as MetricRow[];

  const total = posts.length;
  const posted = posts.filter((p) => p.status === "posted").length;
  const failed = posts.filter((p) => p.status === "failed").length;
  const finished = posted + failed;
  const successRate =
    finished > 0 ? Math.round((posted / finished) * 1000) / 10 : 0;

  const validImpressions = metrics
    .map((m) => m.impressions ?? 0)
    .filter((v) => v > 0);
  const avgImpressions =
    validImpressions.length > 0
      ? Math.round(
          validImpressions.reduce((a, b) => a + b, 0) /
            validImpressions.length,
        )
      : 0;

  const engagementValues = metrics
    .map((m) => {
      const imp = m.impressions ?? 0;
      if (imp <= 0) return null;
      const eng =
        (m.likes ?? 0) +
        (m.retweets ?? 0) +
        (m.replies ?? 0) +
        (m.bookmarks ?? 0);
      return eng / imp;
    })
    .filter((v): v is number => v !== null);
  const avgEngagement =
    engagementValues.length > 0
      ? engagementValues.reduce((a, b) => a + b, 0) / engagementValues.length
      : 0;

  const dailySeries = buildDailySeries(posts, days);
  const accountSeries = buildAccountSeries(posts, accounts);
  const hasMetrics = metrics.length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: COLOR_PRIMARY }}
        >
          分析
        </h1>
        <nav className="flex gap-1 rounded-full p-1"
          style={{ background: SURFACE_BG, border: SURFACE_BORDER }}
        >
          {(Object.keys(RANGE_DAYS) as Range[]).map((r) => {
            const active = r === range;
            return (
              <Link
                key={r}
                href={`/analytics?range=${r}`}
                className="px-3 py-1 rounded-full text-xs font-semibold transition"
                style={{
                  background: active ? COLOR_PRIMARY : "transparent",
                  color: active ? "#ffffff" : TEXT_MUTED,
                }}
              >
                {RANGE_LABEL[r]}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="投稿数" value={String(total)} />
        <StatCard
          label="成功率"
          value={finished > 0 ? `${successRate}%` : "—"}
          hint={finished > 0 ? `${posted} / ${finished}` : undefined}
        />
        <StatCard
          label="平均インプレッション"
          value={avgImpressions > 0 ? avgImpressions.toLocaleString() : "—"}
        />
        <StatCard
          label="平均エンゲージメント率"
          value={
            avgEngagement > 0
              ? `${(avgEngagement * 100).toFixed(2)}%`
              : "—"
          }
        />
      </div>

      <div
        className="rounded-xl p-5"
        style={{ background: SURFACE_BG, border: SURFACE_BORDER }}
      >
        <div
          className="font-semibold text-sm mb-4"
          style={{ color: COLOR_PRIMARY }}
        >
          📈 日別投稿数
        </div>
        {posts.length === 0 ? (
          <EmptyChart message="この期間の投稿はまだありません" />
        ) : (
          <LineChart data={dailySeries} />
        )}
      </div>

      <div
        className="rounded-xl p-5"
        style={{ background: SURFACE_BG, border: SURFACE_BORDER }}
      >
        <div
          className="font-semibold text-sm mb-4"
          style={{ color: COLOR_PRIMARY }}
        >
          📊 アカウント別投稿数
        </div>
        {accountSeries.length === 0 ? (
          <EmptyChart message="アカウント別の投稿データがありません" />
        ) : (
          <BarChart data={accountSeries} />
        )}
      </div>

      {!hasMetrics ? (
        <div
          className="rounded-xl p-4 text-sm text-center"
          style={{
            background: SURFACE_BG,
            border: SURFACE_BORDER,
            color: TEXT_MUTED,
          }}
        >
          メトリクスデータなし — 投稿後に集計されます
        </div>
      ) : null}
    </div>
  );
}
