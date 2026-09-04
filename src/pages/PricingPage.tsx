import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { PLANS, PLAN_CARD_THEME, type PlanDefinition } from "../lib/plans";
import { openRazorpayCheckout } from "../lib/razorpay";
import AuthModal from "../components/AuthModal";

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
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="shrink-0 border-b border-paper-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-lg font-semibold text-ink-950">
            Notice<span className="text-brass-dark">Desk</span>
          </Link>
          {session ? (
            <Link to="/app" className="btn-primary py-2.5">Open app</Link>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="btn-primary py-2.5">Sign in</button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center py-6">
        <section className="mx-auto max-w-3xl px-6 pb-6 text-center">
          <h1 className="text-3xl font-semibold text-ink-950 md:text-4xl">
            Pricing that fits a practice, not an enterprise
          </h1>
          <p className="mt-3 text-base text-ink-700">Start free. Upgrade only once it's saving you real time.</p>
        </section>

        {justPaid && (
          <div className="mx-auto mb-4 max-w-md border border-ok/30 bg-ok/5 px-4 py-2.5 text-center text-sm text-ok">
            Payment received — confirming your plan now, one moment…
          </div>
        )}
        {error && (
          <div className="mx-auto mb-4 max-w-md border border-warn/30 bg-warn/5 px-4 py-2.5 text-center text-sm text-warn">
            {error}
          </div>
        )}

        <section className="mx-auto w-full max-w-6xl px-6 pb-6">
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              const theme = PLAN_CARD_THEME[plan.code];
              return (
                <div key={plan.code} className={`flex flex-col px-6 py-7 ${theme.card} ${theme.text}`}>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className={`mt-1.5 text-sm ${theme.subtext}`}>{plan.description}</p>
                  <p className="mt-5">
                    <span className="text-4xl font-semibold">
                      {plan.priceInr === 0 ? "Free" : `₹${plan.priceInr.toLocaleString("en-IN")}`}
                    </span>
                    {plan.priceInr > 0 && <span className={`text-base ${theme.subtext}`}>/month</span>}
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
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
                    className={`mt-7 w-full py-3 text-sm font-medium transition-colors disabled:opacity-50 ${theme.button}`}
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-4 text-sm text-ink-500 sm:flex-row">
          <p>Cancel anytime. Unused drafts don't roll over.</p>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-ink-800">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-ink-800">Terms of Service</Link>
          </div>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
