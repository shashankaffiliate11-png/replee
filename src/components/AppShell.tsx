import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
    { label: "Dashboard", path: "/app" },
    { label: "Draft New Response", path: "/app/new" },
    { label: "Onboard Client", path: "/app/onboard-client" },
    { label: "History", path: "/app/history" },
    { label: "Settings", path: "/app/settings" },
  ];

  return (
    <div className="flex min-h-screen bg-paper-base">
      {/* Sidebar Container */}
      <aside className="flex w-64 flex-col justify-between border-r border-paper-line bg-paper-dim p-6">
        <div>
          {/* Brand Logo */}
          <Link to="/app" className="flex items-center gap-2 text-xl font-bold text-black">
            <span className="text-2xl">📄</span>
            <span>
              Notice<span className="text-brass">Desk</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="mt-8 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 text-sm transition-colors rounded ${
                    isActive
                      ? "bg-yellow-400 text-black font-semibold"
                      : "text-black hover:bg-yellow-100 font-medium"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-paper-line pt-4 text-xs text-black">
          {/* Plan Status */}
          <p>
            You're on the{" "}
            <strong className="font-semibold">{plan?.name || "Professional"}</strong> plan.
          </p>

          {/* Draft Usage Displayed in Sidebar */}
          <p className="mt-1 font-medium text-black">
            {used} of {limit === "unlimited" ? "unlimited" : limit} drafts used this month
          </p>

          {/* Upgrade Plan Action */}
          <Link
            to="/pricing"
            className="mt-2 block font-semibold text-black underline hover:text-brass-dark"
          >
            Upgrade Plan →
          </Link>

          {/* User Account Details */}
          <div className="mt-4 pt-3 border-t border-paper-line">
            <p className="truncate text-black font-medium">{user?.email}</p>
            <button
              onClick={() => signOut()}
              className="mt-1 text-black underline hover:text-warn text-left"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}