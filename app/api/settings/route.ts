import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SettingsBody {
  key?: unknown;
  value?: unknown;
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SettingsBody;
  try {
    body = (await request.json()) as SettingsBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { key, value } = body;
  if (typeof key !== "string" || key.length === 0) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }
  if (typeof value !== "string") {
    return NextResponse.json({ error: "value must be a string" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("x_settings")
    .upsert({ key, value }, { onConflict: "key" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ setting: data });
}
