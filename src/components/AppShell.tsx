import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  FilePenLine,
  UserPlus,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Bell,
  Rocket,
  ChevronDown,
  LogOut,
  Headset,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { getPlan } from "../lib/plans";
import type { Profile, UsageCounter } from "../lib/database.types";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UsageCounter | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const periodMonth = `${new Date().toISOString().slice(0, 7)}-01`;

    async function loadSidebarData() {
      const [{ data: profileData }, { data: usageData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase
          .from("usage_counters")
          .select("*")
          .eq("user_id", user!.id)
          .eq("period_month", periodMonth)
          .maybeSingle(),
      ]);

      setProfile(profileData);
      setUsage(usageData ?? { user_id: user!.id, period_month: periodMonth, notices_used: 0 });
    }

    loadSidebarData();
  }, [user]);

  const plan = profile ? getPlan(profile.plan) : null;
  const used = usage?.notices_used ?? 0;
  const limit = plan?.noticesPerMonth ?? 3;

  const navItems = [
    { label: "Dashboard", path: "/app", icon: Home },
    { label: "Draft New Response", path: "/app/new", icon: FilePenLine },
    { label: "Onboard Client", path: "/app/onboard-client", icon: UserPlus },
    { label: "History", path: "/app/history", icon: HistoryIcon },
    { label: "Settings", path: "/app/settings", icon: SettingsIcon },
  ];

  const initials = (profile?.full_name || user?.email || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-paper-cream">
      {/* Sidebar */}
      <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-paper-line bg-white">
        {/* Scrolls independently if nav/promo content is ever taller than
            the viewport — the footer below never gets pushed off-screen
            because of this split. */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          {/* Brand */}
          <Link to="/app" className="flex items-center gap-2.5 px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brass text-white">
              <FilePenLine size={18} />
            </span>
            <span className="text-lg font-bold text-ink-950 leading-tight">
              Notice<span className="text-brass-dark">Desk</span>
              <span className="block text-[10px] font-normal tracking-wide text-ink-400">
                GST &amp; Income Tax Notice Management
              </span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="mt-8 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-brass text-white font-semibold shadow-sm"
                      : "text-ink-700 hover:bg-brass-tint font-medium"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Promo card */}
          <div className="mt-8 rounded-xl border border-brass/30 bg-brass-tint p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brass text-white">
              <Rocket size={17} />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink-950">Save Time. Stay Compliant.</p>
            <p className="mt-1 text-xs text-ink-600">AI-powered drafts for GST &amp; Income Tax notices.</p>
            {plan?.code !== "professional" && (
              <Link
                to="/pricing"
                className="mt-3 block rounded-lg bg-brass py-2 text-center text-xs font-semibold text-white hover:bg-brass-dark"
              >
                Upgrade to Pro →
              </Link>
            )}
          </div>
        </div>

        {/* Footer — pinned, always visible, never scrolls out of view */}
        <div className="shrink-0 space-y-4 border-t border-paper-line px-5 py-4">
          <div className="rounded-lg bg-paper-dim p-3 text-xs">
            <p className="text-ink-700">
              You're on the <strong className="font-semibold text-ink-950">{plan?.name || "Professional"}</strong> plan.
            </p>
            <Link
              to="/pricing"
              className="mt-2 block rounded-lg bg-brass py-2 text-center text-xs font-semibold text-white hover:bg-brass-dark"
            >
              Upgrade Plan
            </Link>
          </div>

          <div className="text-xs">
            <p className="flex items-center gap-1.5 font-medium text-ink-700">
              <Headset size={14} /> Need Help?
            </p>
            <p className="mt-0.5 truncate text-ink-500">{user?.email}</p>
            <button
              onClick={() => signOut()}
              className="mt-2 flex items-center gap-1.5 text-ink-500 hover:text-warn"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col">
        {/* Shared top header */}
        <header className="flex items-center gap-4 border-b border-paper-line bg-white px-8 py-3">
          {location.pathname === "/app" && (
            <div>
              <h1 className="text-base font-semibold text-ink-950">
                Welcome back, {profile?.full_name ? profile.full_name.split(" ")[0] : "there"} 👋
              </h1>
              <p className="text-xs text-ink-500">Here's what's happening with your NoticeDesk today.</p>
            </div>
          )}

          <div className="ml-auto flex items-center gap-4">
            <button className="relative text-ink-500 hover:text-ink-800" aria-label="Notifications">
              <Bell size={19} />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-warn text-[10px] font-semibold text-white">
                3
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="flex items-center gap-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brass text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-sm font-medium text-ink-900">
                    {profile?.full_name || "Account"}
                  </span>
                  <span className="block text-[11px] text-ink-500">{plan?.name || "Professional"} Plan</span>
                </span>
                <ChevronDown size={15} className="text-ink-400" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-paper-line bg-white py-1 shadow-lg">
                  <Link
                    to="/app/settings"
                    className="block px-3 py-2 text-sm text-ink-700 hover:bg-paper-dim"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="block w-full px-3 py-2 text-left text-sm text-warn hover:bg-paper-dim"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
