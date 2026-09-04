import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { getPlan } from "../lib/plans";
import type { PlanCode } from "../lib/database.types";

export default function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [planCode, setPlanCode] = useState<PlanCode | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setPlanCode(data?.plan ?? "free_trial"));
  }, [user]);

  const plan = planCode ? getPlan(planCode) : null;

  const navItems = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/new", label: "Draft New Response" },
    { href: "/app/onboard-client", label: "Onboard Client" },
    { href: "/app/history", label: "History" },
    { href: "/app/settings", label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-56 shrink-0 border-r border-paper-line bg-paper-dim md:block">
        <div className="px-5 py-6">
          <Link to="/" className="flex items-center gap-2.5">
            <SealMark />
            <span className="font-semibold text-ink-950">
              Notice<span className="text-brass-dark">Desk</span>
            </span>
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
          {plan && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-ink-600">
                You're on the <span className="font-medium text-ink-950">{plan.name}</span> plan.
              </span>
            </div>
          )}
          {plan && plan.code !== "professional" && (
            <Link
              to="/pricing"
              className="mb-3 inline-block border border-ink-900/20 px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-ink-900/5"
            >
              Upgrade plan
            </Link>
          )}
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
            <span className="font-semibold text-ink-950">
              Notice<span className="text-brass-dark">Desk</span>
            </span>
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
      <rect width="64" height="64" rx="10" fill="#152140" />
      <path d="M18 14h20l10 10v26a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2z" fill="#FAF7F0" />
      <path d="M38 14v8a2 2 0 0 0 2 2h8" fill="#C79445" />
      <line x1="22" y1="34" x2="42" y2="34" stroke="#152140" strokeWidth="2" />
      <line x1="22" y1="40" x2="42" y2="40" stroke="#152140" strokeWidth="2" />
      <line x1="22" y1="46" x2="34" y2="46" stroke="#152140" strokeWidth="2" />
    </svg>
  );
}