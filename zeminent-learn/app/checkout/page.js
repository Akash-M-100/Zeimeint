"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { INDIAN_STATES } from "@/lib/indianStates";

// Slice 14 B.7: Full Access checkout extended to collect a GST billing
// address. Backend has accepted productType + billingAddress since B.2 —
// we were just sending an empty body. Mirrors the placement-program
// checkout from B.5; legal-terms acceptance is intentionally omitted
// (Full Access is a click-buy product, no signed agreement).
//
// Layout: two-column on desktop (form L, sticky order summary R),
// stacked on mobile with the summary on top so price is visible before
// the user reaches the form.

const PRODUCT_NAME = "Zeminent Full Access";
const PRODUCT_TAGLINE =
  "Lifetime access to all courses, certificates, and community.";
const PRICE_INR = 39999;

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE_PATTERN = /^\d{6}$/;

const fmtINR = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

export default function CheckoutPage() {
  const router = useRouter();
  const { user, status } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    stateCode: "",
    pincode: "",
  });
  const [showGstin, setShowGstin] = useState(false);
  const [gstin, setGstin] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Prefill name once auth resolves; don't overwrite if the user has
  // already typed something (browsing back into the form after a dismiss
  // would otherwise wipe their edits).
  useEffect(() => {
    if (status !== "authenticated" || !user?.name) return;
    setFormData((prev) => (prev.name ? prev : { ...prev, name: user.name }));
  }, [status, user]);

  const isValid = useMemo(() => {
    const { name, line1, city, state, stateCode, pincode } = formData;
    const billingOK =
      name.trim() &&
      line1.trim() &&
      city.trim() &&
      state &&
      stateCode &&
      PINCODE_PATTERN.test(pincode);
    if (!billingOK) return false;
    if (showGstin && !GSTIN_PATTERN.test(gstin.trim().toUpperCase())) return false;
    return true;
  }, [formData, showGstin, gstin]);

  const handleStateChange = (e) => {
    // Select binds on stateCode (the 2-digit GST code) — matches the
    // shape the backend expects directly on the billingAddress object.
    const code = e.target.value;
    const match = INDIAN_STATES.find((s) => s.code === code);
    setFormData((prev) => ({
      ...prev,
      stateCode: code,
      state: match?.name || "",
    }));
  };

  const handlePay = useCallback(async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        productType: "full_access",
        billingAddress: {
          name: formData.name.trim(),
          line1: formData.line1.trim(),
          line2: formData.line2.trim(),
          city: formData.city.trim(),
          state: formData.state,
          stateCode: formData.stateCode,
          pincode: formData.pincode.trim(),
          country: "India",
        },
        buyerGSTIN: showGstin && gstin ? gstin.trim().toUpperCase() : null,
      };

      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const orderJson = await orderRes.json().catch(() => ({}));

      // 409 = backend says this user already owns Full Access. Bounce to
      // Dashboard with a toast hint; layout will keep them out on reload.
      if (orderRes.status === 409) {
        router.replace("/Dashboard?toast=already-have-full-access");
        return;
      }
      if (!orderRes.ok) {
        setError(orderJson.message || "Could not create order. Please try again.");
        return;
      }

      const { keyId, order, product } = orderJson.data;
      const result = await openRazorpayCheckout({
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        description: product?.name || PRODUCT_NAME,
        prefillEmail: user?.email,
        prefillName: formData.name.trim(),
      });

      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: result.razorpay_order_id,
          razorpay_payment_id: result.razorpay_payment_id,
          razorpay_signature: result.razorpay_signature,
        }),
      });
      const verifyJson = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        setError(
          verifyJson.message ||
            "Payment verification failed. If you were charged, contact support with your Razorpay payment ID.",
        );
        return;
      }

      const paymentId =
        verifyJson?.data?.payment?._id || verifyJson?.data?.payment?.id;
      const target = paymentId
        ? `/checkout/success?paymentId=${encodeURIComponent(paymentId)}`
        : "/checkout/success";
      router.replace(target);
    } catch (err) {
      // lib/razorpay.ts rejects with this exact string on modal dismiss;
      // treat as a silent cancel so the form survives for retry.
      if (err?.message === "Checkout cancelled") return;
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }, [isValid, submitting, formData, showGstin, gstin, user, router]);

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-8 py-12">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <header className="flex flex-col gap-2 mb-10">
        <div className="font-mono-label">Checkout</div>
        <h1 className="font-display text-3xl md:text-4xl leading-[1.05]">
          Complete your Full Access purchase
        </h1>
        <p className="text-sm md:text-base" style={{ color: "var(--fg-dim)" }}>
          We need a billing address for your GST tax invoice.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        <div className="flex flex-col gap-10 order-2 lg:order-1">
          <section
            className="rounded-2xl p-6 md:p-8 flex flex-col gap-5"
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="font-mono-label">Billing details</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name" htmlFor="name" required full>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={submitting}
                  autoComplete="name"
                  className="form-input"
                />
              </Field>
              <Field label="Address Line 1" htmlFor="line1" required full>
                <input
                  id="line1"
                  type="text"
                  required
                  value={formData.line1}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, line1: e.target.value }))
                  }
                  disabled={submitting}
                  autoComplete="address-line1"
                  className="form-input"
                />
              </Field>
              <Field
                label="Address Line 2"
                htmlFor="line2"
                hint="Apartment, suite, etc. (optional)"
                full
              >
                <input
                  id="line2"
                  type="text"
                  value={formData.line2}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, line2: e.target.value }))
                  }
                  disabled={submitting}
                  autoComplete="address-line2"
                  className="form-input"
                />
              </Field>
              <Field label="City" htmlFor="city" required>
                <input
                  id="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  disabled={submitting}
                  autoComplete="address-level2"
                  className="form-input"
                />
              </Field>
              <Field label="State" htmlFor="state" required>
                <select
                  id="state"
                  required
                  value={formData.stateCode}
                  onChange={handleStateChange}
                  disabled={submitting}
                  className="form-input"
                >
                  <option value="">Select a state…</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="PIN Code" htmlFor="pincode" required>
                <input
                  id="pincode"
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  disabled={submitting}
                  autoComplete="postal-code"
                  className="form-input"
                />
              </Field>
              <Field label="Country" htmlFor="country">
                <input
                  id="country"
                  type="text"
                  value="India"
                  readOnly
                  className="form-input form-input-readonly"
                  aria-readonly="true"
                />
              </Field>
              <div className="md:col-span-2 flex flex-col gap-3">
                <label
                  className="inline-flex items-center gap-2 cursor-pointer"
                  style={{ color: "var(--fg-dim)", fontSize: 13 }}
                >
                  <input
                    type="checkbox"
                    checked={showGstin}
                    onChange={(e) => setShowGstin(e.target.checked)}
                    disabled={submitting}
                  />
                  I have a GSTIN (business purchase)
                </label>
                {showGstin && (
                  <Field
                    label="GSTIN"
                    htmlFor="gstin"
                    hint="15-character GSTIN. Will appear on your tax invoice."
                    full
                  >
                    <input
                      id="gstin"
                      type="text"
                      value={gstin}
                      onChange={(e) =>
                        setGstin(e.target.value.toUpperCase().slice(0, 15))
                      }
                      disabled={submitting}
                      placeholder="22AAAAA0000A1Z5"
                      className="form-input"
                      style={{ textTransform: "uppercase" }}
                    />
                  </Field>
                )}
              </div>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-2xl p-4"
              style={{
                background: "rgba(204,119,85,0.08)",
                border: "1px solid rgba(204,119,85,0.4)",
                color: "#cc7755",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handlePay}
            disabled={submitting || !isValid}
            className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 text-bg px-6 py-3 rounded-full text-base font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Opening checkout…"
              : `Pay ${fmtINR(PRICE_INR)} securely`}
          </button>

          <p className="text-xs text-muted-2 text-center">
            Payments processed by Razorpay. You&apos;ll be redirected back here once
            the transaction is verified.
          </p>
        </div>

        <aside className="order-1 lg:order-2">
          <div
            className="rounded-2xl p-6 lg:sticky lg:top-24"
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="font-mono-label mb-3">Order summary</div>
            <h2 className="font-display" style={{ fontSize: 20, letterSpacing: "-0.01em" }}>
              {PRODUCT_NAME}
            </h2>
            <p
              className="mt-2"
              style={{ color: "var(--fg-dim)", fontSize: 13, lineHeight: 1.55 }}
            >
              {PRODUCT_TAGLINE}
            </p>

            <div className="my-5" style={{ borderTop: "1px solid var(--border)" }} />

            <dl className="grid grid-cols-[1fr_auto] gap-y-2.5 text-sm">
              <dt style={{ color: "var(--fg-dim)" }}>Package fee</dt>
              <dd className="font-mono text-right" style={{ color: "var(--fg)" }}>
                {fmtINR(PRICE_INR)}
              </dd>
              <dt style={{ color: "var(--fg-mute)", fontSize: 12 }}>
                Inclusive of 18% GST
              </dt>
              <dd
                className="font-mono text-right"
                style={{ color: "var(--fg-mute)", fontSize: 12 }}
              >
                included
              </dd>
              <dt
                className="col-span-2"
                style={{ borderTop: "1px solid var(--border)", marginTop: 8 }}
              />
              <dt
                className="font-display pt-3"
                style={{ fontSize: 16, color: "var(--fg)" }}
              >
                Total
              </dt>
              <dd
                className="font-display text-right pt-3"
                style={{ fontSize: 18, color: "var(--accent-2, #5eead4)" }}
              >
                {fmtINR(PRICE_INR)}
              </dd>
            </dl>
            <p className="mt-4" style={{ color: "var(--fg-mute)", fontSize: 11 }}>
              GST breakdown (CGST/SGST or IGST based on state) shown on your
              tax invoice.
            </p>
          </div>
        </aside>
      </div>

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          background: var(--bg-2);
          border: 1px solid var(--border);
          color: var(--fg);
          font-size: 14px;
          padding: 10px 14px;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        :global(.form-input:focus) {
          border-color: var(--accent);
        }
        :global(.form-input:disabled) {
          opacity: 0.6;
          cursor: not-allowed;
        }
        :global(.form-input-readonly) {
          background: var(--bg-1);
          color: var(--fg-mute);
          cursor: default;
        }
      `}</style>
    </div>
  );
}

function Field({ label, htmlFor, required, hint, full, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`flex flex-col gap-1.5 ${full ? "md:col-span-2" : ""}`}
    >
      <span
        className="font-mono uppercase"
        style={{
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "var(--fg-mute)",
        }}
      >
        {label}
        {required && <span style={{ color: "#cc7755" }}> *</span>}
      </span>
      {children}
      {hint && (
        <span style={{ color: "var(--fg-mute)", fontSize: 12 }}>{hint}</span>
      )}
    </label>
  );
}
