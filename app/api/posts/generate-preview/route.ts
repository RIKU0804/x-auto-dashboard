import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePostText, getAccount } from "../_lib/openrouter";

interface PreviewBody {
  account_id?: unknown;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PreviewBody;
  try {
    body = (await request.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { account_id } = body;
  if (typeof account_id !== "string" || account_id.length === 0) {
    return NextResponse.json({ error: "account_id required" }, { status: 400 });
  }

  const account = await getAccount(supabase, account_id);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const text = await generatePostText(supabase, account);
    return NextResponse.json({ post_text: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
