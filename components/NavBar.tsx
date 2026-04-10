"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home, Users, FileText, ScrollText, BookOpen, Newspaper, Menu, X, LogOut,
} from "lucide-react";

const xNav = [
  { href: "/", label: "ホーム", icon: Home, exact: true },
  { href: "/accounts", label: "Xアカウント", icon: Users },
  { href: "/posts", label: "X投稿", icon: FileText },
  { href: "/logs", label: "Xログ", icon: ScrollText },
];

const noteNav = [
  { href: "/note/accounts", label: "Noteアカウント", icon: BookOpen },
  { href: "/note/posts", label: "Note投稿", icon: Newspaper },
];

function NavItem({ href, label, icon: Icon, exact }: { href: string; label: string; icon: React.ElementType; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
      style={{
        borderRadius: 9999,
        color: active ? "var(--text)" : "var(--text-muted)",
        background: active ? "var(--surface)" : "transparent",
      }}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

export default function NavBar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const Sidebar = () => (
    <aside className="flex w-56 flex-col h-full" style={{ background: "#f7f7f4", borderRight: "1px solid var(--border)" }}>
      <div className="flex h-14 items-center px-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="font-bold text-base tracking-tight" style={{ color: "var(--text)" }}>Auto Dashboard</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        <div>
          <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>X管理</p>
          {xNav.map((item) => <NavItem key={item.href} {...item} />)}
        </div>
        {/* Note管理: 非表示（将来対応）
        <div>
          <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Note管理</p>
          {noteNav.map((item) => <NavItem key={item.href} {...item} />)}
        </div>
        */}
      </nav>

      <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
          style={{ borderRadius: 9999, color: "var(--text-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <LogOut size={16} />
          ログアウト
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setOpen(false)} />
      )}

      {/* Sidebar - desktop */}
      <div className="hidden lg:flex lg:flex-col lg:w-56 lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar - mobile */}
      <div className={`fixed inset-y-0 left-0 z-40 lg:hidden transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`} style={{ width: 224 }}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center px-4 lg:hidden" style={{ background: "#f7f7f4", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <Menu size={20} />
          </button>
          <span className="ml-2 font-bold text-sm" style={{ color: "var(--text)" }}>Auto Dashboard</span>
          <button onClick={() => setOpen(false)} className={`ml-auto p-2 rounded-lg lg:hidden ${open ? "" : "hidden"}`}>
            <X size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
