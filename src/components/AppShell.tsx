import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export default function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const navItems = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/new", label: "New draft" },
    { href: "/app/history", label: "History" },
    { href: "/app/settings", label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-56 shrink-0 border-r border-paper-line bg-paper-dim md:block">
        <div className="px-5 py-6">
          <Link to="/" className="flex items-center gap-2.5">
            <SealMark />
            <span className="font-semibold text-ink-950">NoticeDesk</span>
          </Link>
        </div>
        <nav className="px-3">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`block rounded-sm px-3 py-2 text-sm ${
                  active ? "bg-ink-900 text-paper" : "text-ink-700 hover:bg-ink-900/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-56 border-t border-paper-line px-5 py-4">
          <p className="truncate text-xs text-ink-500">{user?.email}</p>
          <button onClick={signOut} className="mt-2 text-xs text-ink-600 hover:text-ink-950">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-paper-line px-4 py-3 md:hidden">
          <Link to="/app" className="flex items-center gap-2">
            <SealMark />
            <span className="font-semibold text-ink-950">NoticeDesk</span>
          </Link>
          <button onClick={signOut} className="text-xs text-ink-600">
            Sign out
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-paper-line px-4 py-2 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="shrink-0 px-3 py-1.5 text-xs text-ink-700"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function SealMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="10" fill="#0F0F0F" />
      <path d="M18 14h20l10 10v26a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2z" fill="#FFFFFF" />
      <path d="M38 14v8a2 2 0 0 0 2 2h8" fill="#FBBF24" />
      <line x1="22" y1="34" x2="42" y2="34" stroke="#0F0F0F" strokeWidth="2" />
      <line x1="22" y1="40" x2="42" y2="40" stroke="#0F0F0F" strokeWidth="2" />
      <line x1="22" y1="46" x2="34" y2="46" stroke="#0F0F0F" strokeWidth="2" />
    </svg>
  );
}
