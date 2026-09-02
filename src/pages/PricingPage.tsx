import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { PLANS } from "../lib/plans";
import AuthModal from "../components/AuthModal";

export default function PricingPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  function handleChoose() {
    if (session) navigate("/app/settings");
    else setAuthOpen(true);
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
                onClick={handleChoose}
                className={`mt-7 w-full py-2.5 text-sm font-medium ${
                  plan.highlighted
                    ? "bg-paper text-ink-950 hover:bg-paper-dim"
                    : "border border-ink-900/20 text-ink-950 hover:bg-ink-900/5"
                }`}
              >
                {plan.priceInr === 0 ? "Start free" : "Choose plan"}
              </button>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-2xl border-t border-paper-line pt-8 text-sm text-ink-600">
          <p className="font-medium text-ink-950">A few things worth knowing</p>
          <ul className="mt-3 space-y-2">
            <li>— Prices are per practice, not per user. Multi-user firm plans are available on request.</li>
            <li>— You can cancel anytime; access continues until the end of the paid period.</li>
            <li>— Unused drafts don't roll over month to month.</li>
          </ul>
        </div>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
