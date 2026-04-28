import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("x_settings")
    .select("key, value");

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return (
    <SettingsClient
      initialSettings={settings}
      initialAutoApprove={settings["auto_approve"] ?? "false"}
      initialMorningTime={settings["morning_time"] ?? "07:00"}
      initialNightTime={settings["night_time"] ?? "20:00"}
    />
  );
}
