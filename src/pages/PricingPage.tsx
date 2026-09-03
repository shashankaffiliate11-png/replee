import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { PLANS, type PlanDefinition } from "../lib/plans";
import { openRazorpayCheckout } from "../lib/razorpay";
import AuthModal from "../components/AuthModal";

// Explicit per-plan color instead of a single "highlighted" flag, since the
// three cards now each need a distinct color (blue / yellow / blue) rather
// than "one dark card among plain ones."
const CARD_THEME: Record<string, { card: string; text: string; subtext: string; feature: string; button: string }> = {
  free_trial: {
    card: "bg-ink-900",
    text: "text-paper",
    subtext: "text-paper/70",
    feature: "text-brass-light",
    button: "bg-brass text-ink-950 hover:bg-brass-light",
  },
  starter: {
    card: "bg-brass",
    text: "text-ink-950",
    subtext: "text-ink-950/70",
    feature: "text-ink-900",
    button: "bg-ink-950 text-paper hover:bg-ink-900",
  },
  professional: {
    card: "bg-ink-900",
    text: "text-paper",
    subtext: "text-paper/70",
    feature: "text-brass-light",
    button: "bg-brass text-ink-950 hover:bg-brass-light",
  },
};

export default function PricingPage() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    if (!justPaid || !user) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
      if (data && data.plan !== "free_trial") {
        clearInterval(interval);
        navigate("/app/settings");
      }
      if (attempts >= 10) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [justPaid, user, navigate]);

  async function handleChoose(plan: PlanDefinition) {
    setError(null);

    if (!session) {
      setAuthOpen(true);
      return;
    }
    if (plan.priceInr === 0) {
      navigate("/app");
      return;
    }

    setProcessingPlan(plan.code);

    const { data, error: fnError } = await supabase.functions.invoke("create-razorpay-subscription", {
      body: { plan: plan.code },
    });

    if (fnError || !data?.subscription_id) {
      const message =
        (fnError as any)?.context?.body?.error ?? "Could not start checkout. Please try again.";
      setError(message);
      setProcessingPlan(null);
      return;
    }

    const result = await openRazorpayCheckout({
      keyId: data.razorpay_key_id,
      subscriptionId: data.subscription_id,
      planName: plan.name,
      prefillEmail: user?.email ?? undefined,
      onSuccess: () => {
        setProcessingPlan(null);
        setJustPaid(true);
      },
      onDismiss: () => setProcessingPlan(null),
    });

    if (!result.ok) {
      setError(result.error ?? "Could not open the payment window.");
      setProcessingPlan(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-y-auto bg-paper md:h-screen md:overflow-hidden">
      <header className="shrink-0 border-b border-paper-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold text-ink-950">
            Notice<span className="text-brass-dark">Desk</span>
          </Link>
          {session ? (
            <Link to="/app" className="btn-primary py-2">Open app</Link>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="btn-primary py-2">Sign in</button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center overflow-hidden">
        <section className="mx-auto max-w-3xl px-6 pb-6 pt-4 text-center">
          <h1 className="text-2xl font-semibold text-ink-950 md:text-3xl">
            Pricing that fits a practice, not an enterprise
          </h1>
          <p className="mt-2 text-sm text-ink-700">Start free. Upgrade only once it's saving you real time.</p>
        </section>

        {justPaid && (
          <div className="mx-auto mb-4 max-w-md border border-ok/30 bg-ok/5 px-4 py-2.5 text-center text-xs text-ok">
            Payment received — confirming your plan now, one moment…
          </div>
        )}
        {error && (
          <div className="mx-auto mb-4 max-w-md border border-warn/30 bg-warn/5 px-4 py-2.5 text-center text-xs text-warn">
            {error}
          </div>
        )}

        <section className="mx-auto w-full max-w-6xl px-6 pb-6">
          <div className="grid gap-5 md:grid-cols-3">
            {PLANS.map((plan) => {
              const theme = CARD_THEME[plan.code];
              return (
                <div key={plan.code} className={`flex flex-col px-5 py-5 ${theme.card} ${theme.text}`}>
                  <h3 className="text-base font-semibold">{plan.name}</h3>
                  <p className={`mt-1 text-xs ${theme.subtext}`}>{plan.description}</p>
                  <p className="mt-3">
                    <span className="text-2xl font-semibold">
                      {plan.priceInr === 0 ? "Free" : `₹${plan.priceInr.toLocaleString("en-IN")}`}
                    </span>
                    {plan.priceInr > 0 && <span className={theme.subtext}>/month</span>}
                  </p>
                  <ul className="mt-3 flex-1 space-y-1.5 text-xs">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className={theme.feature}>—</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleChoose(plan)}
                    disabled={processingPlan !== null}
                    className={`mt-4 w-full py-2 text-sm font-medium transition-colors disabled:opacity-50 ${theme.button}`}
                  >
                    {processingPlan === plan.code
                      ? "Opening checkout…"
                      : plan.priceInr === 0
                      ? "Start free"
                      : "Choose plan"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="shrink-0 border-t border-paper-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-xs text-ink-500">
          <p>Cancel anytime. Unused drafts don't roll over.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-ink-800">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-ink-800">Terms of Service</Link>
          </div>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
