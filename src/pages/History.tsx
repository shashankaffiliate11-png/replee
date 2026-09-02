import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import type { Notice } from "../lib/database.types";

export default function History() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotices(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const filtered = notices.filter((n) =>
    `${n.client_name} ${n.notice_type} ${n.notice_reference_no ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold text-ink-950">All drafts</h1>

      <input
        className="input mt-6 max-w-sm"
        placeholder="Search by client, notice type, or reference no."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <p className="mt-6 text-sm text-ink-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-ink-600">No drafts match.</p>
      ) : (
        <div className="mt-6 divide-y divide-paper-line border border-paper-line bg-white">
          {filtered.map((notice) => (
            <Link
              key={notice.id}
              to={`/app/notices/${notice.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-paper-dim"
            >
              <div>
                <p className="text-sm font-medium text-ink-950">{notice.client_name}</p>
                <p className="text-xs text-ink-500">
                  {notice.notice_type}
                  {notice.notice_reference_no ? ` · ${notice.notice_reference_no}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink-400">
                  {new Date(notice.created_at).toLocaleDateString("en-IN")}
                </span>
                <span className="text-xs uppercase tracking-wide text-ink-400">{notice.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
