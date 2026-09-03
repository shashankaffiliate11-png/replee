import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);

  if (!open) return null;

  async function handle(provider: "google" | "apple") {
    setError(null);
    setLoadingProvider(provider);
    try {
      if (provider === "google") await signInWithGoogle();
      else await signInWithApple();
      // Supabase redirects the browser to the provider; nothing else to do here.
    } catch (e) {
      setError("Sign-in failed to start. Please try again.");
      setLoadingProvider(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm border border-paper-line bg-paper p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-ink-950">Sign in to NoticeDesk</h2>
        <p className="mt-1.5 text-sm text-ink-600">
          Your first 3 drafts are free. No card required.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => handle("google")}
            disabled={loadingProvider !== null}
            className="flex items-center justify-center gap-3 border border-ink-900/20 bg-white py-3 text-sm font-medium text-ink-950 transition-colors hover:bg-ink-900/5 disabled:opacity-50"
          >
            <GoogleMark />
            {loadingProvider === "google" ? "Redirecting…" : "Continue with Google"}
          </button>
          <button
            onClick={() => handle("apple")}
            disabled={loadingProvider !== null}
            className="flex items-center justify-center gap-3 bg-ink-950 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink-900 disabled:opacity-50"
          >
            <AppleMark />
            {loadingProvider === "apple" ? "Redirecting…" : "Continue with Apple"}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-warn">{error}</p>}

        <p className="mt-6 text-xs text-ink-400">
          By continuing, you agree this tool produces draft responses for your
          professional review — you remain responsible for what is filed.
        </p>

        <button
          onClick={onClose}
          className="mt-5 w-full text-center text-xs text-ink-500 hover:text-ink-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.02l7.73 6c4.51-4.18 7.09-10.36 7.09-17.49z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A24.03 24.03 0 0 0 0 24c0 3.87.92 7.53 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.92-2.14 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 384 512" fill="#FFFFFF">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 80.9c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.6zM256.4 89.2c26.9-32 24.5-61.2 23.7-71.7-23.8 1.4-51.3 16.4-67 34.9-17.3 19.8-27.5 44.4-25.3 71.9 25.9 2 49.6-11 68.6-35.1z" />
    </svg>
  );
}
