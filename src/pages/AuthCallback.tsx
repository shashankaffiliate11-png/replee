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

      // Register (or refresh) the Gmail connection using the Google tokens
      // that came back attached to this login session — this is what
      // replaces the old separate "Connect Gmail" step. It's fire-and-forget
      // on failure: a hiccup here should never block someone from reaching
      // the app, since they can always retry by signing in again.
      const providerToken = (retry.session as any).provider_token;
      const providerRefreshToken = (retry.session as any).provider_refresh_token;
      if (providerRefreshToken) {
        try {
          await fetch("/api/gmail/register-from-login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${retry.session.access_token}`,
            },
            body: JSON.stringify({
              access_token: providerToken,
              refresh_token: providerRefreshToken,
            }),
          });
        } catch {
          // Non-fatal — Settings will show "not connected yet" and a
          // fresh sign-in will retry this.
        }
      }

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
