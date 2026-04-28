import { createClient } from "@/lib/supabase/server";
import ComposerClient from "./ComposerClient";

export const dynamic = "force-dynamic";

type Account = {
  id: string;
  name: string;
  genre: string;
};

export default async function NewPostPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("x_accounts")
    .select("id,name,genre")
    .eq("is_active", true)
    .order("created_at");

  const accounts: Account[] = data ?? [];

  return <ComposerClient accounts={accounts} />;
}
