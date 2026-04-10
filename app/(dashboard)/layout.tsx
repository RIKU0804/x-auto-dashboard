import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <NavBar />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
        {children}
      </main>
    </div>
  );
}
