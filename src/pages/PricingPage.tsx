import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { PLANS, type PlanDefinition } from "../lib/plans";
import { openRazorpayCheckout } from "../lib/razorpay";
import AuthModal from "../components/AuthModal";

export default function PricingPage() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justPaid, setJustPaid] = useState(false);

  // Poll briefly after a successful Razorpay payment, since the actual
  // plan flip happens asynchronously via the razorpay-webhook function,
  // not in this browser tab.
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
      if (attempts >= 10) clearInterval(interval); // stop after ~20s either way
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
    <div className="min-h-screen bg-paper">
      <header className="border-b border-paper-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-lg font-semibold text-ink-950">NoticeDesk</Link>
          {session ? (
            <Link to="/app" className="btn-primary py-2.5">Open app</Link>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="btn-primary py-2.5">Sign in</button>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold text-ink-950 md:text-4xl">Pricing that fits a practice, not an enterprise</h1>
        <p className="mt-3 text-ink-700">Start free. Upgrade only once it's saving you real time.</p>
      </section>

      {justPaid && (
        <div className="mx-auto mb-8 max-w-md border border-ok/30 bg-ok/5 px-5 py-4 text-center text-sm text-ok">
          Payment received — confirming your plan now, one moment…
        </div>
      )}

      {error && (
        <div className="mx-auto mb-8 max-w-md border border-warn/30 bg-warn/5 px-5 py-4 text-center text-sm text-warn">
          {error}
        </div>
      )}

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.code}
              className={`flex flex-col border px-6 py-7 ${
                plan.highlighted ? "border-ink-900 bg-ink-950 text-paper" : "border-paper-line bg-white text-ink-950"
              }`}
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className={`mt-1 text-sm ${plan.highlighted ? "text-paper/70" : "text-ink-600"}`}>
                {plan.description}
              </p>
              <p className="mt-5">
                <span className="text-3xl font-semibold">
                  {plan.priceInr === 0 ? "Free" : `₹${plan.priceInr.toLocaleString("en-IN")}`}
                </span>
                {plan.priceInr > 0 && (
                  <span className={plan.highlighted ? "text-paper/70" : "text-ink-500"}>/month</span>
                )}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className={plan.highlighted ? "text-brass-light" : "text-brass-dark"}>—</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleChoose(plan)}
                disabled={processingPlan !== null}
                className={`mt-7 w-full py-2.5 text-sm font-medium disabled:opacity-50 ${
                  plan.highlighted
                    ? "bg-paper text-ink-950 hover:bg-paper-dim"
                    : "border border-ink-900/20 text-ink-950 hover:bg-ink-900/5"
                }`}
              >
                {processingPlan === plan.code
                  ? "Opening checkout…"
                  : plan.priceInr === 0
                  ? "Start free"
                  : "Choose plan"}
              </button>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-2xl border-t border-paper-line pt-8 text-sm text-ink-600">
          <p className="font-medium text-ink-950">A few things worth knowing</p>
          <ul className="mt-3 space-y-2">
            <li>— Prices are per practice, not per user. Multi-user firm plans are available on request.</li>
            <li>— Payments are handled by Razorpay. Your card details never touch NoticeDesk's servers.</li>
            <li>— You can cancel anytime; access continues until the end of the paid period.</li>
            <li>— Unused drafts don't roll over month to month.</li>
          </ul>
        </div>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
