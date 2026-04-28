import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PostStatus = "draft" | "queued" | "posted" | "failed";

interface PatchBody {
  post_text?: unknown;
  status?: unknown;
  approved?: unknown;
  scheduled_for?: unknown;
}

function isPostStatus(value: unknown): value is PostStatus {
  return (
    value === "draft" ||
    value === "queued" ||
    value === "posted" ||
    value === "failed"
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.post_text !== undefined) {
    if (typeof body.post_text !== "string" || body.post_text.length === 0) {
      return NextResponse.json({ error: "post_text must be a non-empty string" }, { status: 400 });
    }
    if (body.post_text.length > 280) {
      return NextResponse.json({ error: "post_text exceeds 280 chars" }, { status: 400 });
    }
    update.post_text = body.post_text;
  }

  if (body.status !== undefined) {
    if (!isPostStatus(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (body.approved !== undefined) {
    if (typeof body.approved !== "boolean") {
      return NextResponse.json({ error: "approved must be boolean" }, { status: 400 });
    }
    update.approved = body.approved;
  }

  if (body.scheduled_for !== undefined) {
    if (body.scheduled_for !== null && typeof body.scheduled_for !== "string") {
      return NextResponse.json({ error: "scheduled_for must be a date string or null" }, { status: 400 });
    }
    update.scheduled_for = body.scheduled_for;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("x_posts")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("x_posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
