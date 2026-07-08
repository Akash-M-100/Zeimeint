export type RazorpayCheckoutInput = {
  keyId: string;
  orderId: string;
  amount: number; // in paise
  currency: string;
  // Free-text shown in the Razorpay modal under the brand name. Caller picks
  // the level of detail (course title, package tagline, etc.).
  description: string;
  prefillEmail?: string;
  prefillName?: string;
};

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

// Opens the Razorpay checkout modal and resolves with the callback payload on
// successful payment, rejects on dismiss / script-not-loaded. The script is
// loaded via <Script src="https://checkout.razorpay.com/v1/checkout.js"> in
// the consuming component (CoursePlayer); this helper just consumes window.Razorpay.
export function openRazorpayCheckout(
  input: RazorpayCheckoutInput,
): Promise<RazorpaySuccess> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof window.Razorpay !== "function") {
      reject(
        new Error(
          "Razorpay checkout script not loaded yet — please try again in a moment",
        ),
      );
      return;
    }
    const rzp = new window.Razorpay({
      key: input.keyId,
      order_id: input.orderId,
      amount: input.amount,
      currency: input.currency,
      name: "Zeminent Learning",
      description: input.description,
      prefill: {
        email: input.prefillEmail,
        name: input.prefillName,
      },
      theme: { color: "#000000" },
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Checkout cancelled")),
      },
    });
    rzp.open();
  });
}
