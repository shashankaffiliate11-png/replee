import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// Supabase's client library already exchanges the OAuth code in the URL
// for a session automatically (detectSessionInUrl: true in supabaseClient.ts).
// This page just waits for that session to land, then decides where to send
// the person: straight into the app if they've onboarded before, or to the
// short onboarding form if this is their first sign-in.
export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Give the client a moment to process the redirect hash/query.
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        // Poll briefly — detectSessionInUrl can take a tick on first paint.
        await new Promise((r) => setTimeout(r, 600));
      }

      const { data: retry } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!retry.session) {
        setMessage("Sign-in did not complete. Redirecting back…");
        setTimeout(() => navigate("/login"), 1500);
        return;
      }

      const userId = retry.session.user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, firm_name")
        .eq("id", userId)
        .maybeSingle();

      if (!profile || !profile.firm_name) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <p className="text-sm text-ink-600">{message}</p>
    </div>
  );
}
