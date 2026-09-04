interface CheckoutOptions {
  keyId: string;
  subscriptionId: string;
  planName: string;
  prefillEmail?: string;
  onSuccess: () => void;
  onDismiss: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function openRazorpayCheckout({
  keyId,
  subscriptionId,
  planName,
  prefillEmail,
  onSuccess,
  onDismiss,
}: CheckoutOptions): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.Razorpay) {
      console.error("Razorpay SDK not found on window object.");
      resolve({
        ok: false,
        error: "Razorpay Checkout SDK not loaded. Ensure script is included in index.html.",
      });
      return;
    }

    try {
      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: "NoticeDesk",
        description: `${planName} Subscription`,
        prefill: { email: prefillEmail },
        theme: { color: "#C79445" },
        handler: function (response: any) {
          console.log("Razorpay Payment Success Response:", response);
          onSuccess();
          resolve({ ok: true });
        },
        modal: {
          ondismiss: function () {
            console.log("Razorpay Modal Closed.");
            onDismiss();
            resolve({ ok: false, error: "Payment window was closed." });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        console.error("Razorpay Payment Failed:", response.error);
        resolve({
          ok: false,
          error: response.error?.description || "Payment failed.",
        });
      });

      rzp.open();
    } catch (err: any) {
      console.error("Failed to initialize Razorpay modal:", err);
      resolve({
        ok: false,
        error: err.message || "Failed to launch payment checkout.",
      });
    }
  });
}