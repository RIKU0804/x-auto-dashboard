// Shared OpenRouter client + prompt builder for AI post generation.
// Ported from x-auto/modules/generator.py (Python) — kept lean.

import type { SupabaseClient } from "@supabase/supabase-js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-flash-1.5";
const USER_PROMPT =
  "次のXポスト1つを日本語で生成。140字以内。ハッシュタグなし。改行可。";

interface Persona {
  name?: string;
  age?: number | string;
  occupation?: string;
  personality?: string;
  hobbies?: string[];
  preferred_male_type?: string;
  values?: string;
  tone?: string;
  post_style?: string;
}

interface AccountRow {
  id: string;
  name?: string | null;
  persona?: Persona | null;
}

function buildSystemPrompt(account: AccountRow): string {
  const persona: Persona = account.persona ?? {};
  const hobbies = Array.isArray(persona.hobbies) ? persona.hobbies.join(", ") : "";
  return [
    "あなたは以下のキャラクターとしてXに投稿する女性です。",
    "キャラクターとして自然な日常のつぶやきを1つ作成してください。",
    "",
    "【キャラクター設定】",
    `名前: ${persona.name ?? account.name ?? "さくら"}（${persona.age ?? 22}歳・${persona.occupation ?? "カフェ店員"}）`,
    `性格: ${persona.personality ?? ""}`,
    `趣味: ${hobbies}`,
    `好きな男性: ${persona.preferred_male_type ?? ""}`,
    `価値観: ${persona.values ?? ""}`,
    `話し方: ${persona.tone ?? ""}`,
    `投稿スタイル: ${persona.post_style ?? ""}`,
    "",
    "制約:",
    "- 140文字以内",
    "- キャラクターの口調・性格を忠実に再現する",
    "- ハッシュタグなし",
    "- AIっぽさ・宣伝っぽさを出さない",
    "- 投稿文だけを出力する（説明や前置きは不要）",
  ].join("\n");
}

async function getModel(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from("x_settings")
    .select("value")
    .eq("key", "openrouter_model")
    .maybeSingle();
  const value = data?.value;
  if (typeof value === "string" && value.length > 0) return value;
  return DEFAULT_MODEL;
}

export async function getAccount(
  supabase: SupabaseClient,
  accountId: string
): Promise<AccountRow | null> {
  const { data } = await supabase
    .from("x_accounts")
    .select("id, name, persona")
    .eq("id", accountId)
    .maybeSingle();
  return (data as AccountRow | null) ?? null;
}

export async function generatePostText(
  supabase: SupabaseClient,
  account: AccountRow
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const model = await getModel(supabase);
  const systemPrompt = buildSystemPrompt(account);

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: USER_PROMPT },
      ],
      temperature: 0.9,
      max_tokens: 200,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let text = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (text.length > 140) text = text.slice(0, 140);
  if (text.length === 0) {
    throw new Error("OpenRouter returned empty content");
  }
  return text;
}
