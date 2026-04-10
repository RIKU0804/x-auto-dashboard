"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const tabs = [
  { href: "/", label: "ホーム", icon: "⚡" },
  { href: "/accounts", label: "アカウント", icon: "👤" },
  { href: "/posts", label: "投稿", icon: "📝" },
  { href: "/logs", label: "ログ", icon: "📋" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
        <span className="font-bold text-base" style={{ color: "var(--text)" }}>X Auto</span>
        <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          ログアウト
        </button>
      </header>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors"
              style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}>
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
