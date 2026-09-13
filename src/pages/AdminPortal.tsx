import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Pencil,
  Check,
  X,
  Trash2,
  Plus,
} from "lucide-react";

type Role = "Reader" | "Editor" | "Admin";

interface Subscriber {
  id: string;
  email: string;
  name: string;
  plan: "free_trial" | "starter" | "professional";
  billingCycle: "monthly" | "yearly" | null;
  startDate: string | null;
  expiryDate: string | null;
  status: "Active" | "Expired";
}

interface AdminUser {
  id: string;
  email: string;
  role: Role;
  created_at: string;
}

interface DashboardData {
  totalSubscribers: number;
  active: number;
  expired: number;
  monthly: number;
  yearly: number;
  mrr: number;
  planCounts: Record<string, number>;
}

const PLAN_LABEL: Record<string, string> = {
  free_trial: "Free Trial",
  starter: "Starter",
  professional: "Professional",
};

export default function AdminPortal() {
  const { session, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [tab, setTab] = useState<"dashboard" | "subscribers" | "users">("dashboard");

  async function authedFetch(url: string, options: RequestInit = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    return res;
  }

  useEffect(() => {
    if (!session) return;
    (async () => {
      const res = await authedFetch("/api/admin/me");
      const data = await res.json();
      setRole(data.role);
      setCheckingRole(false);
    })();
  }, [session]);

  if (authLoading || checkingRole) {
    return (
      <AppShell>
        <p className="text-sm text-ink-500">Loading…</p>
      </AppShell>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (!role) {
    return (
      <AppShell>
        <div className="border border-paper-line bg-white p-8 text-center">
          <p className="text-sm text-ink-700">You don't have access to the Admin Portal.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Admin Portal</h1>
          <p className="mt-1 text-sm text-ink-600">
            Signed in as <span className="font-medium">{role}</span>
            {role === "Reader" && " — view only"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-paper-line">
        <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={LayoutDashboard}>
          Dashboard
        </TabButton>
        <TabButton active={tab === "subscribers"} onClick={() => setTab("subscribers")} icon={Users}>
          Subscribers
        </TabButton>
        <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={ShieldCheck}>
          User Access
        </TabButton>
      </div>

      <div className="mt-6">
        {tab === "dashboard" && <DashboardView authedFetch={authedFetch} />}
        {tab === "subscribers" && <SubscribersView authedFetch={authedFetch} role={role} />}
        {tab === "users" && <UsersView authedFetch={authedFetch} role={role} />}
      </div>
    </AppShell>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "border-brass text-ink-950" : "border-transparent text-ink-500 hover:text-ink-800"
      }`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────
function DashboardView({ authedFetch }: { authedFetch: (url: string, options?: RequestInit) => Promise<Response> }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await authedFetch("/api/admin/dashboard");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load dashboard.");
        return;
      }
      setData(json);
    })();
  }, []);

  if (error) return <p className="text-sm text-warn">{error}</p>;
  if (!data) return <p className="text-sm text-ink-500">Loading dashboard…</p>;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Subscribers" value={data.totalSubscribers} />
        <MetricCard label="Active" value={data.active} accent="text-ok" />
        <MetricCard label="Expired" value={data.expired} accent="text-warn" />
        <MetricCard label="Est. MRR" value={`₹${data.mrr.toLocaleString("en-IN")}`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="border border-paper-line bg-white p-5">
          <h3 className="text-sm font-semibold text-ink-950">Plan distribution</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(data.planCounts).map(([plan, count]) => (
              <div key={plan}>
                <div className="flex justify-between text-xs text-ink-600">
                  <span>{PLAN_LABEL[plan] ?? plan}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="mt-1 h-1.5 w-full bg-paper-dim">
                  <div
                    className="h-1.5 bg-brass"
                    style={{
                      width: `${data.totalSubscribers ? (count / data.totalSubscribers) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-paper-line bg-white p-5">
          <h3 className="text-sm font-semibold text-ink-950">Billing cycle split</h3>
          <div className="mt-4 flex items-center gap-6">
            <div>
              <p className="text-2xl font-semibold text-ink-950">{data.monthly}</p>
              <p className="text-xs text-ink-500">Monthly</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-ink-950">{data.yearly}</p>
              <p className="text-xs text-ink-500">Yearly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="border border-paper-line bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold ${accent ?? "text-ink-950"}`}>{value}</p>
    </div>
  );
}

// ── Subscribers ──────────────────────────────────────────────────────────
function SubscribersView({ authedFetch, role }: { authedFetch: (url: string, options?: RequestInit) => Promise<Response>; role: Role }) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ plan: string; billingCycle: string; startDate: string }>({
    plan: "free_trial",
    billingCycle: "monthly",
    startDate: "",
  });
  const [saving, setSaving] = useState(false);

  const canEdit = role === "Editor" || role === "Admin";

  async function load() {
    setLoading(true);
    const res = await authedFetch("/api/admin/subscribers");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load subscribers.");
      setLoading(false);
      return;
    }
    setSubscribers(json.subscribers);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(s: Subscriber) {
    setEditingId(s.id);
    setEditDraft({
      plan: s.plan,
      billingCycle: s.billingCycle ?? "monthly",
      startDate: s.startDate ?? "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await authedFetch(`/api/admin/subscribers/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        plan: editDraft.plan,
        billingCycle: editDraft.billingCycle,
        startDate: editDraft.startDate,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      const json = await res.json();
      setError(json.error || "Failed to save.");
    }
  }

  if (loading) return <p className="text-sm text-ink-500">Loading subscribers…</p>;
  if (error) return <p className="text-sm text-warn">{error}</p>;

  return (
    <div className="overflow-x-auto border border-paper-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-paper-line bg-paper-dim text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">Subscriber</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Cycle</th>
            <th className="px-4 py-3">Start Date</th>
            <th className="px-4 py-3">End Date</th>
            <th className="px-4 py-3">Status</th>
            {canEdit && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-line">
          {subscribers.map((s) => {
            const isEditing = editingId === s.id;
            return (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink-950">{s.name}</p>
                  <p className="text-xs text-ink-500">{s.email}</p>
                </td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <select
                      className="input py-1 text-xs"
                      value={editDraft.plan}
                      onChange={(e) => setEditDraft({ ...editDraft, plan: e.target.value })}
                    >
                      <option value="free_trial">Free Trial</option>
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                    </select>
                  ) : (
                    PLAN_LABEL[s.plan]
                  )}
                </td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <select
                      className="input py-1 text-xs"
                      value={editDraft.billingCycle}
                      onChange={(e) => setEditDraft({ ...editDraft, billingCycle: e.target.value })}
                      disabled={editDraft.plan === "free_trial"}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  ) : (
                    s.billingCycle ?? "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <input
                      type="date"
                      className="input py-1 text-xs"
                      value={editDraft.startDate}
                      onChange={(e) => setEditDraft({ ...editDraft, startDate: e.target.value })}
                    />
                  ) : (
                    s.startDate ?? "—"
                  )}
                </td>
                <td className="px-4 py-3 text-ink-600">{s.expiryDate ?? "Never"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.status === "Active" ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(s.id)}
                          disabled={saving}
                          className="flex items-center gap-1 rounded bg-brass px-2 py-1 text-xs font-semibold text-black"
                        >
                          <Check size={12} /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 rounded border border-ink-900/20 px-2 py-1 text-xs"
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(s)}
                        className="flex items-center gap-1 text-xs font-medium text-brass-dark hover:text-brass"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── User Access ──────────────────────────────────────────────────────────
function UsersView({ authedFetch, role }: { authedFetch: (url: string, options?: RequestInit) => Promise<Response>; role: Role }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("Reader");
  const [adding, setAdding] = useState(false);

  const isAdmin = role === "Admin";

  async function load() {
    setLoading(true);
    const res = await authedFetch("/api/admin/users");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load users.");
      setLoading(false);
      return;
    }
    setUsers(json.users);
    setCurrentUserEmail(json.currentUserEmail);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    const res = await authedFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ email: newEmail, role: newRole }),
    });
    setAdding(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to add user.");
      return;
    }
    setNewEmail("");
    setNewRole("Reader");
    load();
  }

  async function handleRoleChange(id: string, role: Role) {
    await authedFetch(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ role }) });
    load();
  }

  async function handleRemove(id: string) {
    const res = await authedFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to remove user.");
      return;
    }
    load();
  }

  if (loading) return <p className="text-sm text-ink-500">Loading…</p>;

  return (
    <div>
      {error && <p className="mb-4 text-sm text-warn">{error}</p>}

      {isAdmin && (
        <form onSubmit={handleAdd} className="mb-6 flex flex-wrap items-end gap-3 border border-paper-line bg-white p-4">
          <div className="flex-1 min-w-[220px]">
            <label className="field-label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="teammate@example.com"
            />
          </div>
          <div>
            <label className="field-label">Role</label>
            <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
              <option value="Reader">Reader</option>
              <option value="Editor">Editor</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={adding} className="btn-primary flex items-center gap-1.5">
            <Plus size={14} /> {adding ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto border border-paper-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-paper-line bg-paper-dim text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Added</th>
              {isAdmin && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-line">
            {users.map((u) => {
              const isSelf = u.email === currentUserEmail;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    {u.email}
                    {isSelf && <span className="ml-2 text-xs text-ink-400">(you)</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && !isSelf ? (
                      <select
                        className="input py-1 text-xs"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      >
                        <option value="Reader">Reader</option>
                        <option value="Editor">Editor</option>
                        <option value="Admin">Admin</option>
                      </select>
                    ) : (
                      <span className="rounded-full bg-paper-dim px-2 py-0.5 text-xs font-medium">{u.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {new Date(u.created_at).toLocaleDateString("en-IN")}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {!isSelf && (
                        <button
                          onClick={() => handleRemove(u.id)}
                          className="flex items-center gap-1 text-xs font-medium text-warn hover:underline"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
