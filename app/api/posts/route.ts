import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Cycle = "morning" | "night";
type PostStatus = "draft" | "queued" | "posted" | "failed";

interface CreatePostBody {
  account_id?: unknown;
  cycle?: unknown;
  post_text?: unknown;
  scheduled_for?: unknown;
  status?: unknown;
}

function isCycle(value: unknown): value is Cycle {
  return value === "morning" || value === "night";
}

function isCreatableStatus(value: unknown): value is "draft" | "queued" {
  return value === "draft" || value === "queued";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePostBody;
  try {
    body = (await request.json()) as CreatePostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { account_id, cycle, post_text, scheduled_for, status } = body;

  if (typeof account_id !== "string" || account_id.length === 0) {
    return NextResponse.json({ error: "account_id required" }, { status: 400 });
  }
  if (!isCycle(cycle)) {
    return NextResponse.json({ error: "cycle must be morning or night" }, { status: 400 });
  }
  if (typeof post_text !== "string" || post_text.length === 0) {
    return NextResponse.json({ error: "post_text required" }, { status: 400 });
  }
  if (post_text.length > 280) {
    return NextResponse.json({ error: "post_text exceeds 280 chars" }, { status: 400 });
  }
  if (!isCreatableStatus(status)) {
    return NextResponse.json({ error: "status must be draft or queued" }, { status: 400 });
  }
  if (
    scheduled_for !== undefined &&
    scheduled_for !== null &&
    typeof scheduled_for !== "string"
  ) {
    return NextResponse.json({ error: "scheduled_for must be a date string" }, { status: 400 });
  }

  const approved = status === "queued";

  const insertRow = {
    account_id,
    cycle,
    post_text,
    status,
    approved,
    source: "manual" as const,
    scheduled_for: scheduled_for ?? null,
  };

  const { data, error } = await supabase
    .from("x_posts")
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data }, { status: 201 });
}
