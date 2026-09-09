import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultEmail?: string;
  defaultMobile?: string;
};

export default function ContactSupportModal({
  open,
  onClose,
  defaultName = "",
  defaultEmail = "",
  defaultMobile = "",
}: Props) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [mobile, setMobile] = useState(defaultMobile);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Re-sync the pre-filled fields whenever the modal is (re)opened, in case
  // the profile finished loading after the component first mounted.
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setEmail(defaultEmail);
      setMobile(defaultMobile);
      setMessage("");
      setResult(null);
    }
  }, [open, defaultName, defaultEmail, defaultMobile]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke("send-support-request", {
        body: { name, email, mobile, message },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (error || !data?.success) {
        throw new Error((data as any)?.error || error?.message || "Could not send your message.");
      }

      setResult({ type: "success", message: "Message sent — we'll get back to you shortly." });
      setMessage("");
    } catch (err: any) {
      setResult({ type: "error", message: err.message || "Could not send your message. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-ink-950">Contact Support</h2>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-950"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-600">
          Send us a message and we'll get back to you at the email below.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="field-label" htmlFor="support-name">Name</label>
            <input
              id="support-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="support-email">Email</label>
            <input
              id="support-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="support-mobile">Mobile number</label>
            <input
              id="support-mobile"
              className="input"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="support-message">How can we help?</label>
            <textarea
              id="support-message"
              className="input min-h-[100px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue or question..."
              required
            />
          </div>

          {result && (
            <p className={`text-sm ${result.type === "success" ? "text-ok" : "text-warn"}`}>
              {result.message}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={sending} className="btn-primary">
              {sending ? "Sending…" : "Submit"}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-950">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
