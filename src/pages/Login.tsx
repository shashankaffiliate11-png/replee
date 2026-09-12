import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { session, loading, signInWithGoogle, signInWithApple } = useAuth();
  const [consented, setConsented] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Sign in — NoticeDesk";
  }, []);

  if (loading) return null;
  if (session) return <Navigate to="/app" replace />;

  async function handle(provider: "google" | "apple") {
    if (!consented) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setError(null);
    setLoadingProvider(provider);
    try {
      if (provider === "google") await signInWithGoogle();
      else await signInWithApple();
      // Supabase redirects the browser to the provider; nothing else to do here.
    } catch {
      setError("Sign-in failed to start. Please try again.");
      setLoadingProvider(null);
    }
  }

  return (
    <div className="min-h-screen w-full bg-white font-sans text-zinc-900 antialiased">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* Left — brand / hero panel, purely illustrative */}
        <div className="relative flex w-full flex-col justify-between overflow-hidden bg-[#0A0A0A] px-7 py-8 sm:px-10 lg:w-[55%] lg:px-12 lg:py-10 xl:px-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_10%_100%,rgba(255,199,0,0.22),transparent_55%),radial-gradient(80%_70%_at_90%_0%,rgba(255,255,255,0.06),transparent),linear-gradient(180deg,#0A0A0A_0%,#111111_55%,#181818_100%)]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-[520px] w-[520px] rounded-full bg-brass/[0.18] blur-[90px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-brass/40 via-white/10 to-transparent" />

          <div className="relative z-10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brass text-[18px] font-black leading-none text-black shadow-[0_0_0_1px_rgba(255,199,0,0.4)]">
                N
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-semibold tracking-tight text-white">
                  Notice<span className="text-brass">Desk</span>
                </span>
                <span className="rounded-full bg-brass px-2.5 py-[3px] text-[10px] font-bold leading-none tracking-widest text-black">
                  CA TOOL
                </span>
              </div>
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium tracking-wide text-white/50">SYSTEM ONLINE</span>
            </div>
          </div>

          <div className="relative z-10 mt-14 max-w-[620px] lg:mt-0">
            <h1 className="font-extrabold leading-[0.95] tracking-tight">
              <span className="block text-[34px] text-white sm:text-[42px] lg:text-[46px] xl:text-[52px]">
                GST &amp; Income Tax Notices
              </span>
              <span className="mt-1 block text-[34px] text-brass sm:text-[42px] lg:text-[46px] xl:text-[52px]">
                Answered Before Your
              </span>
              <span className="relative mt-1 inline-block text-[34px] text-brass sm:text-[42px] lg:text-[46px] xl:text-[52px]">
                Client Even Calls
                <span className="absolute -bottom-2 left-0 h-1.5 w-full rounded-full bg-brass sm:-bottom-3 sm:h-2" />
              </span>
            </h1>

            <p className="mt-10 max-w-[500px] text-[15px] leading-relaxed text-zinc-400 sm:text-base">
              Paste the notice, add the facts of the case, and get a structured, section-cited draft response
              you review and finalize —{" "}
              <span className="text-white/80">not a black-box answer you have to trust blindly.</span>
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-brass/30 bg-black px-3.5 py-2 text-[11px] font-semibold tracking-wide text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                AI DRAFTING LIVE
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-12 flex items-center justify-between lg:mt-0">
            <span className="text-[11px] tracking-wide text-white/35">
              © {new Date().getFullYear()} NoticeDesk • Built for CAs
            </span>
            <div className="hidden items-center gap-4 text-[11px] text-white/35 sm:flex">
              <span className="h-px w-6 bg-white/15" />
              <span>3 free drafts • No card</span>
            </div>
          </div>
        </div>

        {/* Right — sign-in panel */}
        <div className="flex w-full items-center justify-center bg-white px-5 py-8 sm:px-8 lg:w-[45%] lg:px-10 lg:py-10">
          <div className="w-full max-w-[400px]">
            <div className="mb-7">
              <h2 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">Sign in</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                Continue with Google or Apple. Your first 3 drafts are free.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => {
                  setConsented(e.target.checked);
                  if (e.target.checked) setError(null);
                }}
                className="mt-[3px] h-4 w-4 rounded border-zinc-300 text-black accent-black focus:ring-0"
              />
              <span className="text-xs leading-relaxed text-zinc-600">
                I have read and agree to the{" "}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#0A0A0A] underline decoration-brass decoration-2 underline-offset-2 hover:text-black"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#0A0A0A] underline decoration-brass decoration-2 underline-offset-2 hover:text-black"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => handle("google")}
                disabled={loadingProvider !== null || !consented}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-black shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <GoogleMark />
                {loadingProvider === "google" ? "Redirecting…" : "Google"}
              </button>
              <button
                onClick={() => handle("apple")}
                disabled={loadingProvider !== null || !consented}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-black shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <AppleMark />
                {loadingProvider === "apple" ? "Redirecting…" : "Apple"}
              </button>
            </div>

            {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}

            <div className="mt-8 space-y-3">
              <p className="text-center text-[11.5px] leading-relaxed text-zinc-500">
                3 free drafts. No card required. Every draft is marked for your review before you send it.
              </p>
              <div className="flex items-start gap-2.5 rounded-xl border border-brass/30 bg-[#FFF8DB] px-3.5 py-3">
                <div className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brass text-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 9v4M12 17h.01M10.3 3.3a2 2 0 0 1 3.4 0l7.1 12.3a2 2 0 0 1-1.7 3H5a2 2 0 0 1-1.7-3l7-12.3z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-[11.5px] font-medium leading-relaxed text-[#5A4A00]">
                  Draft not final filing — you review and finalize every response
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
              <span className="h-px w-8 bg-zinc-200" />
              <span>Encrypted • CA-grade security</span>
              <span className="h-px w-8 bg-zinc-200" />
            </div>

            <Link to="/" className="mt-6 block text-center text-xs text-zinc-400 hover:text-zinc-700">
              ← Back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.35 11.1H12v2.9h5.3c-.25 1.4-1.5 2.6-3 3.05v2.5h4.9c2.85-2.6 4.5-6.45 4.5-11 0-.7-.06-1.37-.18-2h-.17z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-4.9-2.5c-.86.58-1.96.93-3.07.9-2.36 0-4.36-1.6-5.08-3.75H.48v2.6C2.13 20.1 6.77 22 12 22z" />
      <path fill="#FBBC05" d="M6.92 14.21A6.5 6.5 0 0 1 6.57 12c0-.8.14-1.56.35-2.29V7.1H.48A10 10 0 0 0 0 12c0 1.6.38 3.12 1.05 4.45l5.87-2.24z" />
      <path fill="#EA4335" d="M12 6.75c1.47 0 2.8.51 3.84 1.5l2.88-2.88C17.06 3.88 14.8 3 12 3 6.77 3 2.13 4.9.48 8.19l5.88 2.52C7.07 8.56 9.2 6.75 12 6.75z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 384 512" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 80.9c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.6zM256.4 89.2c26.9-32 24.5-61.2 23.7-71.7-23.8 1.4-51.3 16.4-67 34.9-17.3 19.8-27.5 44.4-25.3 71.9 25.9 2 49.6-11 68.6-35.1z" />
    </svg>
  );
}
