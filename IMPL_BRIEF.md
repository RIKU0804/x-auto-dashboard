# Implementation Brief: Postiz-style Dashboard Features

## Stack
- **Next.js 16.2.3 + React 19.2 + Tailwind 4** (bleeding edge — read `node_modules/next/dist/docs/` before assuming behavior)
- **Supabase** (existing): tables in `migrations/` of `../x-auto`
- **TypeScript strict**

## Existing Conventions (DO NOT BREAK)

### Auth pattern (every server route + page)
```ts
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Page top of file
```ts
export const dynamic = "force-dynamic";
```

### Styling
- **No shadcn/ui yet** — pages use inline `style={{ background: "var(--bg)", ... }}` + Tailwind utility classes for layout
- Theme tokens in `app/globals.css`: `var(--bg)`, `var(--text)`, `var(--text-muted)`, `var(--surface)`, `var(--border)`, `var(--danger)`
- Status badges: `posted` = green / `failed` = red / `queued`/`draft` = amber
- Card surface: `background: "#ebeae5"`, `border: "1px solid rgba(38,37,30,0.12)"`, `borderRadius: 12px`
- Page wrapper: `<div className="space-y-4 max-w-2xl">` (or `max-w-4xl` for wide views)

### Existing routes
- `/` (home/dashboard), `/accounts`, `/posts`, `/logs`, `/settings`, `/login`
- API: `/api/auth`, `/api/note`, `/api/run` (POSTs to GitHub Actions to dispatch worker)

## Schema After Migration 003

```
x_posts:
  id UUID, account_id TEXT, cycle 'morning'|'night',
  trend_summary TEXT, post_text TEXT, x_tweet_id TEXT,
  status 'draft'|'queued'|'posted'|'failed',  ← 'draft' is NEW
  approved BOOLEAN DEFAULT false,             ← NEW
  scheduled_for DATE,                         ← NEW (which day to post)
  source 'auto'|'manual' DEFAULT 'auto',     ← NEW
  error_message TEXT, posted_at TIMESTAMPTZ, created_at TIMESTAMPTZ

x_post_metrics:                                ← NEW TABLE
  id UUID, post_id UUID FK, impressions INT, likes INT,
  retweets INT, replies INT, bookmarks INT, measured_at TIMESTAMPTZ

x_settings:
  + auto_approve ('true'|'false') ← controls whether worker auto-marks posts approved=true
  + morning_time, night_time (HH:MM) ← display only for now (cron stays fixed)
```

## Worker Contract (Python `worker.py` will be updated separately)
- Worker reads `x_settings.auto_approve`. If `'true'`, generated posts go straight to `status='queued'`+`approved=true`. If `'false'`, generated posts go to `status='draft'`+`approved=false`.
- Worker only posts where `approved=true` AND `status='queued'` AND (`scheduled_for IS NULL OR scheduled_for <= CURRENT_DATE`) AND matches today's cycle.
- Manual posts created from UI: `source='manual'`, can be `status='draft'` (review later) or `status='queued'`+`approved=true` (post next cycle).

## Features to Build (all 6)

### F1. Calendar view `/calendar`
- Month grid showing posts by `scheduled_for` (or `created_at` for legacy posts)
- Each cell shows up to 3 posts with status color, "+N more"
- Click cell → list view of that day's posts
- Click post → drawer with full text, status, approve/edit buttons
- Top: month nav prev/next/today, account filter
- READ ONLY drag/drop in v1 (don't implement DnD; just clickable lists). Mention this is v1.

### F2. Draft queue `/drafts`
- List `status='draft'` posts grouped by account
- Each row: post text preview, account badge, cycle, created_at, 3 buttons: 承認 / 再生成 / 削除
- 承認 → `approved=true, status='queued'`
- 再生成 → `POST /api/posts/[id]/regenerate` (returns new post_text, updates row)
- 削除 → DELETE
- Empty state: "下書きはありません"

### F3. Post composer `/posts/new`
- Form: account select (from x_accounts), cycle select (morning/night), scheduled_for date picker (optional), post_text textarea (max 280 chars char counter)
- Buttons: 「下書き保存」(status=draft, approved=false) / 「予約投稿」(status=queued, approved=true)
- AI生成ボタン: pre-fills textarea with AI-generated content (calls `/api/posts/generate-preview`)
- Sets `source='manual'`

### F4. Analytics `/analytics`
- 7d / 30d / 90d range tabs
- Top stats cards: total posts, post success rate, avg impressions, avg engagement rate
- Line chart: posts per day (split posted vs failed)
- Bar chart: account performance (posts count per account)
- Use simple SVG charts or `recharts` (add to package.json if used). Keep deps minimal — try SVG first.
- Empty state for accounts/dates with no data

### F5. Settings additions (extend existing `/settings`)
- Add toggle: 「AI生成を自動承認する」 (writes `x_settings.auto_approve` 'true'/'false')
- Add display-only fields for morning_time / night_time (read from settings, write back; document that GitHub Actions cron is fixed and these are display only)

### F6. AI regen + preview
- Inline 再生成 button on draft cards (calls regen API; updates post_text)
- Preview button on composer (calls generate-preview)
- Backend: both call OpenRouter via existing pattern. Reuse model from `x_settings.openrouter_model`.

## API Routes to Build

All require auth check (see pattern above). All return `NextResponse.json(...)`.

```
POST   /api/posts                  body: { account_id, cycle, post_text, scheduled_for?, status }
                                   → creates post with source='manual'

PATCH  /api/posts/[id]             body: { post_text?, status?, approved?, scheduled_for? }
                                   → updates fields

DELETE /api/posts/[id]             → deletes post

POST   /api/posts/[id]/regenerate  → calls OpenRouter, updates post_text, returns new text

POST   /api/posts/generate-preview body: { account_id }
                                   → returns AI-generated post_text without saving

GET    /api/metrics/summary?range=7d|30d|90d
                                   → returns { totals, daily, byAccount }

PATCH  /api/settings               body: { key, value }
                                   → upserts x_settings
```

### Notes for Next.js 16
- Route handler params: `{ params }: { params: Promise<{ id: string }> }` — MUST `await params`
- Use `NextRequest` and `NextResponse` from `next/server`
- Server actions also work but stick with API routes for consistency

### OpenRouter call pattern (see x-auto/modules/generator.py for prompts; port the gist)
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Model: read from `x_settings.openrouter_model`
- Auth: `Authorization: Bearer ${process.env.OPENROUTER_API_KEY}`
- For preview/regen, use account `persona` JSONB to build system prompt

## Nav update
Add to `components/NavBar.tsx` `xNav` array (between 投稿 and ログ):
```
{ href: "/calendar", label: "カレンダー", icon: Calendar },
{ href: "/drafts", label: "下書き", icon: PenLine },
{ href: "/analytics", label: "分析", icon: BarChart3 },
```
Lucide icons: `Calendar`, `PenLine`, `BarChart3`.

## Testing
- Don't write Playwright tests in this pass (out of scope)
- After build: `npm run build` MUST succeed
- Manual smoke: launch dev server, click through new pages, verify no runtime errors

## Out of scope for this pass
- Drag-and-drop on calendar
- Real-time metric scraping (worker side)
- Multi-tenant / team features
- Mobile-first composer (works fine on mobile per existing layout)
