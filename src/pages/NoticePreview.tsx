import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabaseClient";

export default function NoticePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNotice() {
      if (!id) return;

      try {
        // Attempt to fetch from Supabase
        const { data, error: supabaseError } = await supabase
          .from("notices")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (supabaseError) throw supabaseError;

        if (data) {
          setNotice(data);
        } else {
          // Fallback to Express API if notice is not found in Supabase
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          const res = await fetch(`/api/notices/${id}`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          });
          const apiData = await res.json();
          if (apiData.success) {
            setNotice(apiData.data);
          } else {
            setError("Notice preview not found.");
          }
        }
      } catch (err: any) {
        console.error("Error loading notice preview:", err);
        setError("Failed to load notice preview details.");
      } finally {
        setLoading(false);
      }
    }

    fetchNotice();
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="p-8 text-center text-ink-500">Loading response preview…</div>
      </AppShell>
    );
  }

  if (error || !notice) {
    return (
      <AppShell>
        <div className="p-8 text-center">
          <p className="text-red-600 mb-4">{error || "Notice not found."}</p>
          <button onClick={() => navigate("/app")} className="btn-primary text-xs">
            ← Back to Dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/app" className="text-xs text-ink-600 hover:text-ink-950 flex items-center gap-1">
          ← Back to Dashboard
        </Link>
        <button
          onClick={() => window.print()}
          className="btn-primary text-xs"
        >
          Print / Export PDF
        </button>
      </div>

      <div className="border border-paper-line bg-white p-8 shadow-sm">
        <div className="border-b border-paper-line pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-ink-950">
                {notice.firm_name || notice.client_name || "Unassigned Practice / Firm"}
              </h1>
              <p className="text-xs text-ink-500 mt-1">
                GSTIN: {notice.gst_number || notice.extracted_gstin || "N/A"} | PAN: {notice.pan_number || notice.extracted_pan || "N/A"}
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold uppercase bg-brass/10 text-brass-dark border border-brass/30">
              {notice.notice_type || "Tax Notice Response"}
            </span>
          </div>
        </div>

        <div className="space-y-4 text-sm text-ink-800 leading-relaxed">
          <div className="grid grid-cols-2 gap-4 bg-paper-dim p-4 text-xs mb-6">
            <div>
              <strong className="block text-ink-600">Authorized Signatory:</strong>
              <span>{notice.signatory_name || "N/A"}</span>
            </div>
            <div>
              <strong className="block text-ink-600">Tax Authority / Department:</strong>
              <span>{notice.tax_authority || "Income Tax / GST Department"}</span>
            </div>
          </div>

          <div className="prose max-w-none">
            <h3 className="text-base font-semibold text-ink-950 mb-2">Generated Draft Response:</h3>
            <div className="bg-paper-dim/40 border border-paper-line p-5 font-mono text-xs whitespace-pre-wrap rounded">
              {notice.response_draft || notice.generated_response || notice.summary || "No draft content has been generated for this notice yet."}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}