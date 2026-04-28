import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePostText, getAccount } from "../../_lib/openrouter";

export async function POST(
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

  const { data: post, error: postErr } = await supabase
    .from("x_posts")
    .select("id, account_id")
    .eq("id", id)
    .maybeSingle();

  if (postErr) {
    return NextResponse.json({ error: postErr.message }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const account = await getAccount(supabase, post.account_id);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  let newText: string;
  try {
    newText = await generatePostText(supabase, account);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: updated, error: updErr } = await supabase
    .from("x_posts")
    .update({ post_text: newText })
    .eq("id", id)
    .select()
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ post: updated, post_text: newText });
}
