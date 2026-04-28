import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Range = "7d" | "30d" | "90d";

interface PostRow {
  id: string;
  account_id: string | null;
  status: string | null;
  posted_at: string | null;
  created_at: string | null;
}

interface MetricRow {
  post_id: string | null;
  impressions: number | null;
  likes: number | null;
  retweets: number | null;
  replies: number | null;
  bookmarks: number | null;
  measured_at: string | null;
}

function parseRange(value: string | null): Range {
  if (value === "30d" || value === "90d") return value;
  return "7d";
}

function rangeDays(range: Range): number {
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return 7;
}

function dayKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = parseRange(request.nextUrl.searchParams.get("range"));
  const days = rangeDays(range);

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const sinceIso = since.toISOString();

  const { data: postsData, error: postsErr } = await supabase
    .from("x_posts")
    .select("id, account_id, status, posted_at, created_at")
    .gte("created_at", sinceIso);

  if (postsErr) {
    return NextResponse.json({ error: postsErr.message }, { status: 500 });
  }

  const posts: PostRow[] = (postsData ?? []) as PostRow[];

  // Try to load metrics; treat missing/empty table as a soft fallback.
  let metrics: MetricRow[] = [];
  if (posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const { data: metricsData, error: metricsErr } = await supabase
      .from("x_post_metrics")
      .select(
        "post_id, impressions, likes, retweets, replies, bookmarks, measured_at"
      )
      .in("post_id", postIds);
    if (!metricsErr && Array.isArray(metricsData)) {
      metrics = metricsData as MetricRow[];
    }
  }

  // Latest metric per post (by measured_at desc).
  const latestByPost = new Map<string, MetricRow>();
  for (const m of metrics) {
    if (!m.post_id) continue;
    const existing = latestByPost.get(m.post_id);
    if (!existing) {
      latestByPost.set(m.post_id, m);
      continue;
    }
    const a = existing.measured_at ? new Date(existing.measured_at).getTime() : 0;
    const b = m.measured_at ? new Date(m.measured_at).getTime() : 0;
    if (b > a) latestByPost.set(m.post_id, m);
  }

  // Totals.
  const totalPosts = posts.length;
  const postedCount = posts.filter((p) => p.status === "posted").length;
  const failedCount = posts.filter((p) => p.status === "failed").length;
  const attempted = postedCount + failedCount;
  const successRate = attempted === 0 ? 0 : postedCount / attempted;

  let impressionsTotal = 0;
  let engagementsTotal = 0;
  let metricsCount = 0;
  for (const m of latestByPost.values()) {
    const imp = m.impressions ?? 0;
    const likes = m.likes ?? 0;
    const rts = m.retweets ?? 0;
    const reps = m.replies ?? 0;
    const bms = m.bookmarks ?? 0;
    impressionsTotal += imp;
    engagementsTotal += likes + rts + reps + bms;
    metricsCount += 1;
  }
  const avgImpressions = metricsCount === 0 ? 0 : impressionsTotal / metricsCount;
  const avgEngagementRate =
    impressionsTotal === 0 ? 0 : engagementsTotal / impressionsTotal;

  // Daily breakdown (posted/failed counts).
  const dailyMap = new Map<string, { posted: number; failed: number; total: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { posted: 0, failed: 0, total: 0 });
  }
  for (const p of posts) {
    const key = dayKey(p.posted_at) ?? dayKey(p.created_at);
    if (!key) continue;
    const bucket = dailyMap.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (p.status === "posted") bucket.posted += 1;
    if (p.status === "failed") bucket.failed += 1;
  }
  const daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // By account.
  const byAccountMap = new Map<
    string,
    { account_id: string; total: number; posted: number; failed: number }
  >();
  for (const p of posts) {
    const key = p.account_id ?? "unknown";
    const entry = byAccountMap.get(key) ?? {
      account_id: key,
      total: 0,
      posted: 0,
      failed: 0,
    };
    entry.total += 1;
    if (p.status === "posted") entry.posted += 1;
    if (p.status === "failed") entry.failed += 1;
    byAccountMap.set(key, entry);
  }
  const byAccount = Array.from(byAccountMap.values()).map((row) => {
    const attemptedAccount = row.posted + row.failed;
    return {
      ...row,
      successRate: attemptedAccount === 0 ? 0 : row.posted / attemptedAccount,
    };
  });

  return NextResponse.json({
    range,
    totals: {
      totalPosts,
      postedCount,
      failedCount,
      successRate,
      avgImpressions,
      avgEngagementRate,
      hasMetrics: metricsCount > 0,
    },
    daily,
    byAccount,
  });
}
