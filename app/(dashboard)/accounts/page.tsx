import { createClient } from "@/lib/supabase/server";
import AccountsClient from "./AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("x_accounts")
    .select("*")
    .order("created_at");

  return <AccountsClient initialAccounts={accounts ?? []} />;
}
