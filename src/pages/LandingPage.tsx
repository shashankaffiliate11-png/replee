import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Mail,
  Menu,
  Play,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PLANS } from "../lib/plans";
import { BLOG_POSTS } from "../lib/blogPosts";

const FEATURES = [
  {
    icon: Mail,
    title: "Auto Email Extraction",
    desc: "Connects to your practice Gmail. Detects GST & IT notices automatically as they land.",
  },
  {
    icon: ScanSearch,
    title: "PAN / GSTIN Extraction",
    desc: "AI reads attachment PDFs, extracts PAN, GSTIN, dates and notice sections automatically.",
  },
  {
    icon: FileText,
    title: "ASMT-10, DRC-01 Support",
    desc: "Trained on GST and Income Tax notice types: ASMT-10, DRC-01, 142(1), 148, 143(2) and more.",
  },
  {
    icon: Zap,
    title: "1-Click Drafts",
    desc: "A structured, section-cited draft response ready for your review in seconds, not hours.",
  },
  {
    icon: Users,
    title: "Client Vault",
    desc: "All notices organized client-wise, with a full draft history in one place.",
  },
  {
    icon: ShieldCheck,
    title: "CA-Reviewed by Design",
    desc: "Every draft is exactly that — a draft. You review, edit, and finalize before it's yours to file.",
  },
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Connect Gmail",
    desc: "One-click OAuth. Read-only access, encrypted, never used to train any model.",
    points: ["Auto-label: GST/IT notice", "Attachment PDF parsed", "Client auto-matched by PAN/GSTIN"],
  },
  {
    n: "02",
    title: "AI Drafts a Response",
    desc: "Facts, submissions, and relief sought — structured the way officers expect.",
    points: ["Section-cited submissions", "Uses only the facts on record", "Ready for your review"],
  },
  {
    n: "03",
    title: "Review & Finalize",
    desc: "Your letterhead, your edits, your call. Nothing is ever filed automatically.",
    points: ["Full inline editing", "Export as Word or PDF", "Status: Drafted → Finalized"],
  },
];

const FAQS = [
  {
    q: "Is this tool a substitute for my professional judgment?",
    a: "No. NoticeDesk drafts a response for your review — you remain the professional of record for anything you file. See our Terms of Service for the full framing.",
  },
  {
    q: "Which notices are supported?",
    a: "GST: ASMT-10, DRC-01, REG-17. Income Tax: 143(1), 143(2), 148. TDS default notices. More types are added over time.",
  },
  {
    q: "Is my client data safe?",
    a: "Gmail access is read-only via OAuth. Notice files are stored in a private, access-controlled bucket only you can reach. See our Privacy Policy for full details.",
  },
  {
    q: "Can I edit AI drafts?",
    a: "Every draft is fully editable before you finalize it — nothing is sent or filed on your behalf at any point.",
  },
];

const DEMO_ROWS = [
  { from: "cbic-gst@gov.in", id: "27ABCDE1234F1Z5", type: "ASMT-10", time: "2m ago", status: "DRAFTED" },
  { from: "e-filing@incometax.gov", id: "ABCDE1234F", type: "143(2)", time: "8m ago", status: "DRAFTED" },
  { from: "cbic-gst@gov.in", id: "29AACCM1234Q1Z9", type: "DRC-01", time: "21m ago", status: "PROCESSING" },
];

export default function LandingPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function handleEnterApp() {
    if (session) navigate("/app");
    else navigate("/login");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-ink-950 antialiased selection:bg-brass selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[auto_1fr_auto] items-center px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 rotate-[-3deg] items-center justify-center rounded-[10px] bg-brass shadow-[0_2px_8px_rgba(255,199,0,0.4)]">
              <div className="grid h-7 w-7 -rotate-[3deg] place-items-center rounded-[7px] bg-black text-[15px] font-extrabold text-brass">
                N
              </div>
            </div>
            <span className="text-lg font-extrabold tracking-tight">NoticeDesk</span>
            <span className="ml-1 hidden rounded-full bg-black px-2 py-1 text-[10px] font-bold tracking-widest text-white md:inline-flex">
              CA TOOL
            </span>
          </Link>

          <nav className="hidden items-center justify-center gap-7 text-sm font-medium text-black/60 lg:flex">
            <a href="#features" className="transition hover:text-black">Features</a>
            <a href="#how" className="transition hover:text-black">How it works</a>
            <a href="#pricing" className="transition hover:text-black">Pricing</a>
            <Link to="/blog" className="transition hover:text-black">Blog</Link>
          </nav>

          <div className="flex items-center gap-3 justify-self-end">
            <button
              onClick={handleEnterApp}
              className="flex h-9 items-center gap-1.5 rounded-full bg-brass px-5 text-[13px] font-bold text-black shadow-[0_4px_12px_rgba(255,199,0,0.35)] transition hover:brightness-105 active:scale-[0.98]"
            >
              Draft New Response <ArrowRight size={14} />
            </button>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="grid h-9 w-9 place-items-center rounded-full bg-black text-white lg:hidden"
            >
              {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="flex flex-col gap-3 border-t bg-white px-6 py-4 text-sm font-medium lg:hidden">
            <a href="#features" onClick={() => setMobileNavOpen(false)}>Features</a>
            <a href="#how" onClick={() => setMobileNavOpen(false)}>How it works</a>
            <a href="#pricing" onClick={() => setMobileNavOpen(false)}>Pricing</a>
            <Link to="/blog" onClick={() => setMobileNavOpen(false)}>Blog</Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_70%_0%,rgba(255,199,0,0.18),transparent)]" />
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-6 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1.5 text-[11px] font-bold tracking-wide text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brass" />
                AI PROCESSING • LIVE
              </div>
              <div className="inline-flex items-center rounded-full bg-brass px-3 py-1.5 text-[11px] font-bold tracking-wide text-black">
                2.3s avg
              </div>
            </div>

            <h1 className="mt-6 text-[36px] font-extrabold leading-[0.98] tracking-tight lg:text-[52px]">
              GST &amp; Income Tax Notices{" "}
              <span className="relative inline-block">
                Answered Before
                <span className="absolute -bottom-2 left-0 h-[10px] w-full -rotate-1 bg-brass/60" />
              </span>{" "}
              Your Client Even Calls
            </h1>

            <p className="mt-6 max-w-[560px] text-base font-medium leading-[1.6] text-black/60 lg:text-lg">
              As soon as a notice lands in your inbox, NoticeDesk extracts{" "}
              <span className="font-semibold text-black">GSTIN, PAN, Notice Type</span> &amp;
              auto-generates a legally vetted response draft in{" "}
              <span className="font-semibold text-black">2.3 seconds</span>.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={handleEnterApp}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brass px-7 text-[15px] font-bold text-black shadow-[0_8px_20px_rgba(255,199,0,0.4)] transition hover:brightness-[1.02] active:scale-[0.98]"
              >
                Start Free Trial <ArrowRight size={18} />
              </button>
              <a
                href="#how"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-black/10 bg-white px-6 text-sm font-semibold transition hover:bg-black hover:text-white"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-black text-white">
                  <Play size={12} fill="white" />
                </span>
                See how it works
              </a>
            </div>

            <p className="mt-4 text-xs text-black/40">
              3 free drafts. No card required. Every draft is marked for your review before you send it.
            </p>

            <div className="mt-8 flex items-center gap-2 rounded-full bg-brass/20 px-2.5 py-1 text-[12px] font-semibold">
              <Sparkles size={12} /> Draft not final filing — you review and finalize every response
            </div>
          </div>

          {/* Live extraction mockup — purely illustrative, not interactive */}
          <div className="relative pointer-events-none select-none">
            <div className="absolute -inset-6 -z-10 rounded-[32px] bg-brass/20 blur-[40px]" />
            <div className="rounded-[24px] border border-black/10 bg-white p-3 shadow-[0_20px_60px_rgba(0,0,0,0.12)] lg:p-4">
              <div className="overflow-hidden rounded-[16px] border border-black/10 bg-white">
                <div className="flex h-11 items-center justify-between border-b border-black/10 px-4">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-black/70">
                    <div className="grid h-6 w-6 place-items-center rounded-full bg-brass font-bold text-black">N</div>
                    Automated Email Extraction
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      LIVE
                    </span>
                  </div>
                  <span className="rounded-full bg-brass px-2.5 py-1 text-[10px] font-bold text-black">2.3s avg</span>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-[1.2fr_0.9fr_0.6fr_0.6fr] px-3 py-2 text-[10px] font-bold tracking-widest text-black/30">
                    <span>FROM</span>
                    <span>EXTRACTED ID</span>
                    <span>TYPE</span>
                    <span>STATUS</span>
                  </div>
                  <div className="space-y-2">
                    {DEMO_ROWS.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[1.2fr_0.9fr_0.6fr_0.6fr] items-center rounded-xl border border-black/[0.06] bg-black/[0.02] px-3 py-3 text-[12px] text-black hover:bg-black/[0.04]"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="grid h-7 w-7 place-items-center rounded-full bg-paper-dim text-black">
                            <Mail size={12} />
                          </div>
                          <div className="truncate">
                            <div className="truncate font-semibold">{row.from}</div>
                            <div className="text-[10px] text-black/40">{row.time}</div>
                          </div>
                        </div>
                        <div className="truncate font-mono text-[11px]">{row.id}</div>
                        <div className="font-bold">{row.type}</div>
                        <div>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                              row.status === "DRAFTED"
                                ? "bg-brass text-black"
                                : "border border-black/10 bg-black/5 text-black/60"
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[14px] border border-black/10 bg-paper-dim p-4 text-ink-950">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-widest text-black/40">
                        AI DRAFT PREVIEW · ASMT-10
                      </span>
                      <span className="rounded-full bg-brass px-2 py-1 text-[10px] font-bold text-black">
                        REVIEW REQUIRED
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-2 w-5/6 rounded-full bg-black/10" />
                      <div className="h-2 w-full rounded-full bg-black/10" />
                      <div className="h-2 w-4/6 rounded-full bg-black/10" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="h-8 rounded-full bg-black text-center text-[12px] font-bold leading-8 text-white">
                        Review Draft
                      </div>
                      <div className="h-8 rounded-full border border-black/10 bg-white text-center text-[12px] font-semibold leading-8">
                        Edit Draft
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1440px] px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-black px-3 py-1 text-[11px] font-bold tracking-widest text-white">
              HOW IT WORKS
            </div>
            <h2 className="mt-4 text-[28px] font-extrabold leading-[1.05] tracking-tight lg:text-[36px]">
              From inbox to client-ready draft.
              <br />
              No copy-paste.
            </h2>
          </div>
          <p className="max-w-[380px] text-sm font-medium text-black/60">
            Built for Indian CAs handling GST and Income Tax notices every week.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.n}
              className={`rounded-[20px] border p-6 ${
                i === 1
                  ? "border-black bg-[#0A0A0A] text-white shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
                  : "border-black/10 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[12px] font-bold tracking-widest ${i === 1 ? "text-brass" : "text-black/30"}`}>
                  STEP {step.n}
                </span>
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold ${
                    i === 1 ? "bg-brass text-black" : "bg-black text-white"
                  }`}
                >
                  {step.n}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-tight">{step.title}</h3>
              <p className={`mt-2 text-[13px] leading-[1.5] ${i === 1 ? "text-white/60" : "text-black/60"}`}>
                {step.desc}
              </p>
              <div className="mt-5 space-y-2">
                {step.points.map((point) => (
                  <div
                    key={point}
                    className={`flex items-center gap-2 text-[12px] font-medium ${
                      i === 1 ? "text-white/80" : "text-black/70"
                    }`}
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brass text-black">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {point}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#0A0A0A] text-white">
        <div className="mx-auto max-w-[1440px] px-6 py-16 lg:px-8 lg:py-20">
          <div className="mb-8 flex items-center gap-3">
            <span className="rounded-full bg-brass px-3 py-1 text-[11px] font-bold tracking-widest text-black">
              FEATURES BUILT FOR CA PRACTICE
            </span>
            <div className="hidden h-px flex-1 bg-white/10 md:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-[18px] border border-white/10 bg-[#1A1A1A] p-6 transition hover:border-brass/40"
              >
                <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-brass text-black transition group-hover:-rotate-6">
                  <f.icon size={18} />
                </div>
                <h4 className="mt-4 text-base font-bold tracking-tight">{f.title}</h4>
                <p className="mt-2 text-[13px] leading-[1.5] text-white/55">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — real plan data, new visual language */}
      <section id="pricing" className="mx-auto max-w-[1440px] scroll-mt-20 px-6 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[720px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brass px-3 py-1 text-[11px] font-bold tracking-widest text-black">
            SIMPLE, PRACTICE-SIZED PRICING
          </div>
          <h2 className="mt-5 text-[32px] font-extrabold leading-[0.95] tracking-tight lg:text-[44px]">
            Priced for a Practice,
            <br />
            Not an Enterprise
          </h2>
          <p className="mt-4 text-sm font-medium text-black/60">
            Start free. Upgrade only once it's saving you real time.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.code}
              className={`relative flex flex-col rounded-[20px] border p-5 ${
                plan.highlighted
                  ? "border-brass bg-white shadow-[0_0_0_1px_#FFC700,0_20px_40px_-12px_rgba(255,199,0,0.35)] lg:-mt-2 lg:scale-[1.03]"
                  : "border-black/10 bg-white"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-3 py-1 text-[10px] font-bold tracking-widest text-white">
                  <Sparkles size={10} className="text-brass" /> MOST POPULAR
                </div>
              )}
              <div className="text-[13px] font-bold tracking-widest text-black/40">{plan.name.toUpperCase()}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[28px] font-extrabold tracking-tight">
                  {plan.priceInr === 0 ? "Free" : `₹${plan.priceInr.toLocaleString("en-IN")}`}
                </span>
                {plan.priceInr > 0 && <span className="text-xs font-medium text-black/50">/mo</span>}
              </div>
              <p className="mt-2 text-xs font-medium text-black/50">{plan.description}</p>
              <div className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex gap-2 text-xs font-medium text-black/70">
                    <span className="mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-full bg-black text-white">
                      <Check size={10} />
                    </span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleEnterApp}
                className={`mt-6 h-10 rounded-full text-[13px] font-bold ${
                  plan.highlighted
                    ? "bg-brass text-black shadow-[0_6px_16px_rgba(255,199,0,0.4)]"
                    : "bg-black text-white"
                }`}
              >
                {plan.priceInr === 0 ? "Start free" : `Choose ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* Blog preview */}
        <div className="mx-auto mt-16 max-w-[1000px]">
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-xl font-extrabold tracking-tight">From the blog</h3>
            <Link to="/blog" className="text-sm font-semibold text-brass-dark hover:underline">
              View all guides →
            </Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="rounded-2xl border border-black/10 bg-white p-5 transition hover:border-brass/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-brass-dark">
                  {new Date(post.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} · {post.readTime}
                </p>
                <p className="mt-2 text-base font-bold leading-snug text-ink-950">{post.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-black/60">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div id="faq" className="mx-auto mt-16 max-w-[760px]">
          <h3 className="text-center text-xl font-extrabold tracking-tight">Frequently asked questions</h3>
          <div className="mt-6 divide-y divide-black/10 overflow-hidden rounded-[16px] border border-black/10 bg-white">
            {FAQS.map((f, i) => (
              <button
                key={f.q}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-black/[0.02]"
              >
                <div>
                  <div className="text-[13px] font-bold">{f.q}</div>
                  {openFaq === i && (
                    <div className="mt-2 text-[12px] font-medium leading-[1.5] text-black/60">{f.a}</div>
                  )}
                </div>
                <span
                  className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border transition ${
                    openFaq === i ? "border-black bg-black text-white" : "border-black/10 text-black/40"
                  }`}
                >
                  <ChevronDown size={14} className={openFaq === i ? "rotate-180 transition" : "transition"} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0A0A0A] text-white">
        <div
          className="h-1.5 w-full"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, #FFC700 0 24px, #FFD740 24px 48px)" }}
        />
        <div className="mx-auto grid max-w-[1440px] gap-8 px-6 py-12 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 rotate-[-3deg] place-items-center rounded-[10px] bg-brass">
                <div className="grid h-7 w-7 -rotate-[3deg] place-items-center rounded-[7px] bg-black text-sm font-extrabold text-brass">
                  N
                </div>
              </div>
              <span className="text-lg font-extrabold tracking-tight">NoticeDesk</span>
            </div>
            <p className="mt-4 max-w-[320px] text-[13px] leading-[1.6] text-white/50">
              AI-powered GST and Income Tax notice drafting for Indian Chartered Accountants — you review and finalize every response.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest text-white/30">PRODUCT</div>
            <div className="mt-3 space-y-2 text-[13px] text-white/60">
              <a href="#features" className="block hover:text-white">Features</a>
              <a href="#pricing" className="block hover:text-white">Pricing</a>
              <a href="#how" className="block hover:text-white">How it works</a>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest text-white/30">LEGAL</div>
            <div className="mt-3 space-y-2 text-[13px] text-white/60">
              <Link to="/privacy" className="block hover:text-white">Privacy Policy</Link>
              <Link to="/terms" className="block hover:text-white">Terms of Service</Link>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest text-white/30">GET STARTED</div>
            <button
              onClick={handleEnterApp}
              className="mt-3 grid h-10 w-full place-items-center rounded-full bg-brass text-[13px] font-bold text-black"
            >
              Get Started at ₹999/mo →
            </button>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-[11px] text-white/30">
          © {new Date().getFullYear()} NoticeDesk. Not a substitute for professional judgment — every draft requires your review before filing.
        </div>
      </footer>
    </div>
  );
}
