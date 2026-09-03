// Loads Razorpay's Checkout script once and exposes a typed helper to open
// the payment widget for a subscription created by the
// create-razorpay-subscription edge function.

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  theme?: { color?: string };
  prefill?: { email?: string; name?: string };
  handler: (response: unknown) => void;
  modal?: { ondismiss?: () => void };
}

let scriptLoadPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

export async function openRazorpayCheckout(opts: {
  keyId: string;
  subscriptionId: string;
  planName: string;
  prefillEmail?: string;
  prefillName?: string;
  onSuccess: () => void;
  onDismiss: () => void;
}): Promise<{ ok: boolean; error?: string }> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    return { ok: false, error: "Could not load the payment widget. Check your connection and try again." };
  }

  const razorpay = new window.Razorpay({
    key: opts.keyId,
    subscription_id: opts.subscriptionId,
    name: "NoticeDesk",
    description: `${opts.planName} plan`,
    theme: { color: "#0F0F0F" },
    prefill: { email: opts.prefillEmail, name: opts.prefillName },
    handler: () => opts.onSuccess(),
    modal: { ondismiss: () => opts.onDismiss() },
  });

  razorpay.open();
  return { ok: true };
}
