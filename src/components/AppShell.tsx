import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen bg-paper-bg">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-paper-line bg-white flex flex-col justify-between p-4">
        <div>
          {/* App Brand Header */}
          <div className="flex items-center gap-2 mb-6 px-3 py-2">
            <div className="h-8 w-8 rounded bg-ink-950 text-white flex items-center justify-center font-bold text-sm">
              ND
            </div>
            <span className="font-semibold text-lg text-ink-950">
              NoticeDesk
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <NavLink
              to="/app/dashboard"
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-ink-950 text-white"
                    : "text-ink-600 hover:text-ink-950 hover:bg-paper-dim"
                }`
              }
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/app/notices/new"
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-ink-950 text-white"
                    : "text-ink-600 hover:text-ink-950 hover:bg-paper-dim"
                }`
              }
            >
              New draft
            </NavLink>

            {/* Onboard Client Link directly below New draft */}
            <NavLink
              to="/app/onboard-client"
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-ink-950 text-white"
                    : "text-ink-600 hover:text-ink-950 hover:bg-paper-dim"
                }`
              }
            >
              Onboard Client
            </NavLink>

            <NavLink
              to="/app/history"
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-ink-950 text-white"
                    : "text-ink-600 hover:text-ink-950 hover:bg-paper-dim"
                }`
              }
            >
              History
            </NavLink>

            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-ink-950 text-white"
                    : "text-ink-600 hover:text-ink-950 hover:bg-paper-dim"
                }`
              }
            >
              Settings
            </NavLink>
          </nav>
        </div>

        {/* User Session Footer */}
        {user && (
          <div className="border-t border-paper-line pt-4 px-3">
            <p className="text-xs font-medium text-ink-900 truncate">
              {user.email}
            </p>
            <button
              onClick={() => signOut()}
              className="mt-2 text-xs font-medium text-warn hover:underline"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
