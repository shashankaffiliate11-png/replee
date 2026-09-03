import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { PLANS } from "../lib/plans";
import AuthModal from "../components/AuthModal";

export default function LandingPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  function handlePrimaryCta() {
    if (session) navigate("/app");
    else setAuthOpen(true);
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader onSignIn={() => setAuthOpen(true)} isSignedIn={!!session} />

      {/* Hero */}
      <section className="border-b border-paper-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <p className="mb-4 font-mono text-xs text-brass-dark">For practicing Chartered Accountants</p>
            <h1 className="text-4xl font-semibold leading-[1.15] text-ink-950 md:text-5xl">
              A GST or IT notice lands.
              <br />
              Your reply is ready in minutes.
            </h1>
            <p className="mt-5 max-w-prose text-base text-ink-700 md:text-lg">
              Paste the notice, add the facts of the case, and get a structured,
              section-cited draft response you review and finalise — not a
              black-box answer you have to trust blindly.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button onClick={handlePrimaryCta} className="btn-primary">
                Draft your first response free
              </button>
              <Link to="/pricing" className="btn-secondary">
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-xs text-ink-400">
              3 free drafts. No card required. Every draft is marked for your review before you send it.
            </p>
          </div>

          <NoticeBeforeAfter />
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-paper-line bg-paper-dim">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <h2 className="text-2xl font-semibold text-ink-950 md:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            <Step
              index="1"
              title="Paste or upload the notice"
              body="Add the notice text, the section it's issued under, and any case-specific facts — turnover figures, dates, prior filings."
            />
            <Step
              index="2"
              title="Get a structured draft"
              body="A response organised the way assessing officers expect: facts, submissions, and relief sought, referencing the relevant sections."
            />
            <Step
              index="3"
              title="Review, edit, finalise"
              body="Every draft is exactly that — a draft. Edit it in the app, export to Word, and it's yours to sign off on and file."
            />
          </div>
        </div>
      </section>

      {/* Trust / disclaimer strip */}
      <section className="border-b border-paper-line">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="border border-paper-line bg-white px-6 py-5">
            <p className="text-sm text-ink-700">
              <span className="font-medium text-ink-950">This tool drafts. You decide.</span>{" "}
              Every response is generated for your professional review — nothing is filed or
              sent on your behalf. You remain responsible for what goes to the department,
              same as reviewing a junior's draft today.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="text-2xl font-semibold text-ink-950 md:text-3xl">Simple, practice-sized pricing</h2>
        <p className="mt-2 max-w-prose text-ink-700">
          Priced for a solo or small practice, not an enterprise compliance department.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
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
                onClick={handlePrimaryCta}
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
      </section>

      <SiteFooter />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function SiteHeader({ onSignIn, isSignedIn }: { onSignIn: () => void; isSignedIn: boolean }) {
  return (
    <header className="border-b border-paper-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <SealMark />
          <span className="text-lg font-semibold tracking-tight text-ink-950">
            Notice<span className="text-brass-dark">Desk</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/pricing" className="hidden text-sm text-ink-700 hover:text-ink-950 sm:inline">
            Pricing
          </Link>
          {isSignedIn ? (
            <Link to="/app" className="btn-primary py-2.5">
              Open app
            </Link>
          ) : (
            <button onClick={onSignIn} className="btn-primary py-2.5">
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-paper-line">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink-500">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <p>© {new Date().getFullYear()} NoticeDesk. Built for Indian tax practice.</p>
          <p>Not a substitute for professional judgment. Drafts require your review before filing.</p>
        </div>
        <div className="mt-4 flex gap-5 border-t border-paper-line pt-4">
          <Link to="/privacy" className="hover:text-ink-800">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-ink-800">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

function SealMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="10" fill="#152140" />
      <path d="M18 14h20l10 10v26a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2z" fill="#FAF7F0" />
      <path d="M38 14v8a2 2 0 0 0 2 2h8" fill="#C79445" />
      <line x1="22" y1="34" x2="42" y2="34" stroke="#152140" strokeWidth="2" />
      <line x1="22" y1="40" x2="42" y2="40" stroke="#152140" strokeWidth="2" />
      <line x1="22" y1="46" x2="34" y2="46" stroke="#152140" strokeWidth="2" />
    </svg>
  );
}

function Step({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="border-t border-ink-900/15 pt-4">
      <p className="font-mono text-xs text-brass-dark">{index}</p>
      <h3 className="mt-2 font-semibold text-ink-950">{title}</h3>
      <p className="mt-2 text-sm text-ink-700">{body}</p>
    </div>
  );
}

function NoticeBeforeAfter() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="w-full max-w-sm border border-paper-line bg-white p-5 shadow-[6px_6px_0_0_#E4DCC8]">
        <p className="font-mono text-[10px] text-ink-500">GST ASMT-10 · Notice Reference: ZD290824...</p>
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-ink-700">
          <p>
            Discrepancy noted between GSTR-3B and GSTR-2A for FY 2024-25.
            Explain the mismatch of ₹4,82,600 within 15 days...
          </p>
        </div>
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-paper-line" />
          <span className="font-mono text-[10px] text-brass-dark">DRAFTED →</span>
          <div className="h-px flex-1 bg-paper-line" />
        </div>
        <div className="space-y-2 border-t border-dashed border-paper-line pt-4 text-xs leading-relaxed text-ink-950">
          <p className="font-medium">Re: Response to Form GST ASMT-10</p>
          <p>
            1. The mismatch arises from invoices raised in March 2025 and
            reflected in the recipient's GSTR-2A only in April 2025...
          </p>
          <p>2. Reconciliation statement enclosed as Annexure A...</p>
        </div>
      </div>
    </div>
  );
}
