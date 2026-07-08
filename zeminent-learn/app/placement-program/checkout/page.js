"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { INDIAN_STATES } from "@/lib/indianStates";

// Slice 14 B.5: placement-program checkout. New surface (NOT the Slice 12
// /checkout which is single-product Full Access). Pricing is presentational
// — backend is source of truth, but we duplicate the constants here so the
// page renders meaningfully before the create-order call resolves.
const PRODUCT_NAME = "Placement Guarantee Program";
const PRODUCT_TAGLINE =
  "6-month placement commitment with full refund if no placement is secured.";
const PRICE_INR = 249999;
// Mirrors the version identifier the backend persists on the Enrollment doc
// (`metadata.termsAccepted.version`). Bump this here AND in the backend's
// terms-of-service revision the same day so the snapshot is auditable.
const TERMS_VERSION = "v1.0-2026-06-15";

// Verbatim copy of placement-program/page.js's PLACEHOLDER_TERMS. Kept in
// sync manually (small enough that drift is loud); real legal text replaces
// these before launch. Bracketed [PLACEHOLDER:] entries make the open
// questions visible to the buyer during preview — they MUST resolve before
// we collect money in production.
const PLACEHOLDER_TERMS = [
  "Active participation in the program for the full 6-month duration",
  "Application to at least 5 opportunities per week from our partner network",
  "Acceptance of any offer matching your stated salary expectation (cannot decline 3+ valid offers and remain eligible for refund)",
  "Full refund of ₹2,49,999 (less ₹25,000 program admin fee) if no placement is secured within 6 months despite active participation",
  "[PLACEHOLDER: Definition of 'placement' — salary minimum, role type, location flexibility]",
  "[PLACEHOLDER: Dispute resolution clause]",
  "[PLACEHOLDER: Refund timeline and method]",
];

// Loose 15-character GSTIN shape — strict checksum validation is overkill
// for an optional field. Backend stores as-is; tax invoice surfaces it on
// the BILL TO block when present.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE_PATTERN = /^\d{6}$/;

const fmtINR = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

export default function PlacementCheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Billing form state — one useState per field matches the codebase's
  // existing controlled-input pattern (see placement-program/page.js
  // LeadCaptureRail). Prefilled where possible; user.name updates pull in
  // once auth resolves.
  const [name, setName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [pincode, setPincode] = useState("");
  const [hasGstin, setHasGstin] = useState(false);
  const [gstin, setGstin] = useState("");

  // Terms scroll-to-accept gate. `scrolledToBottom` is one-way — once the
  // user has reached the end we don't re-disable on scroll-back-up; the
  // intent has been demonstrated.
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const termsRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // user.name lands after auth bootstrap; backfill once unless the user has
  // already typed something. Email is rendered read-only directly from user
  // — no local state needed.
  useEffect(() => {
    if (user?.name && !name) setName(user.name);
  }, [user, name]);

  const onStateChange = (ev) => {
    const code = ev.target.value;
    const match = INDIAN_STATES.find((s) => s.code === code);
    setStateCode(code);
    setState(match?.name || "");
  };

  const onTermsScroll = (ev) => {
    if (scrolledToBottom) return;
    const el = ev.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setScrolledToBottom(true);
    }
  };

  // Aggregate validity. Pay button + payload assembly both read from this.
  const isValid = useMemo(() => {
    const required =
      name.trim() &&
      line1.trim() &&
      city.trim() &&
      state.trim() &&
      stateCode.trim() &&
      PINCODE_PATTERN.test(pincode);
    if (!required) return false;
    if (hasGstin && !GSTIN_PATTERN.test(gstin.trim().toUpperCase())) return false;
    if (!termsChecked) return false;
    return true;
  }, [name, line1, city, state, stateCode, pincode, hasGstin, gstin, termsChecked]);

  const handlePay = useCallback(async () => {
    if (submitting || !isValid) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        productType: "placement_program",
        billingAddress: {
          name: name.trim(),
          line1: line1.trim(),
          line2: line2.trim(),
          city: city.trim(),
          state,
          stateCode,
          pincode: pincode.trim(),
          country: "India",
        },
        buyerGSTIN: hasGstin ? gstin.trim().toUpperCase() : null,
        termsAccepted: {
          version: TERMS_VERSION,
          acceptedAt: new Date().toISOString(),
        },
      };

      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const orderJson = await orderRes.json().catch(() => ({}));

      if (!orderRes.ok) {
        // Map common backend errors to actionable copy. Defaults preserve
        // the upstream message when available so an unexpected case still
        // shows something useful instead of a generic blank.
        if (orderRes.status === 409) {
          setError(orderJson.message || "You already have an active enrollment.");
        } else if (orderRes.status === 403) {
          setError(orderJson.message || "You are not eligible for this program yet.");
        } else if (orderRes.status === 400) {
          setError(orderJson.message || "Please check your billing details.");
        } else {
          setError(orderJson.message || "Could not create order. Please try again.");
        }
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
        prefillName: name.trim(),
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
        ? `/placement-program/checkout/success?paymentId=${encodeURIComponent(paymentId)}`
        : "/placement-program/checkout/success";
      router.replace(target);
    } catch (err) {
      // lib/razorpay.ts rejects with this exact message on modal dismiss
      // — treat as a silent cancel so the form stays intact for retry.
      if (err?.message === "Checkout cancelled") return;
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    isValid,
    name,
    line1,
    line2,
    city,
    state,
    stateCode,
    pincode,
    hasGstin,
    gstin,
    user,
    router,
  ]);

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-8 py-12">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <header className="flex flex-col gap-2 mb-10">
        <div className="font-mono-label">Enrollment</div>
        <h1 className="font-display text-3xl md:text-4xl leading-[1.05]">
          Enroll in the Placement Guarantee Program
        </h1>
        <p className="text-sm md:text-base" style={{ color: "var(--fg-dim)" }}>
          Complete your enrollment in a few steps.
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  autoComplete="name"
                  className="form-input"
                />
              </Field>
              <Field label="Email" htmlFor="email" required full>
                <input
                  id="email"
                  type="email"
                  required
                  value={user?.email || ""}
                  readOnly
                  className="form-input form-input-readonly"
                  aria-readonly="true"
                />
              </Field>
              <Field label="Address Line 1" htmlFor="line1" required full>
                <input
                  id="line1"
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
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
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
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
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={submitting}
                  autoComplete="address-level2"
                  className="form-input"
                />
              </Field>
              <Field label="State" htmlFor="state" required>
                <select
                  id="state"
                  required
                  value={stateCode}
                  onChange={onStateChange}
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
                  value={pincode}
                  onChange={(e) =>
                    setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
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
                    checked={hasGstin}
                    onChange={(e) => setHasGstin(e.target.checked)}
                    disabled={submitting}
                  />
                  I have a GSTIN (business purchase)
                </label>
                {hasGstin && (
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

          <section
            className="rounded-2xl p-6 md:p-8 flex flex-col gap-5"
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="font-mono-label">Program agreement</div>
              <span
                className="font-mono uppercase"
                style={{
                  color: "#cc7755",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                }}
              >
                Draft Terms — preview only
              </span>
            </div>
            <p style={{ color: "var(--fg-dim)", fontSize: 14 }}>
              By enrolling, you agree to:
            </p>
            <div
              ref={termsRef}
              onScroll={onTermsScroll}
              className="rounded-xl p-5"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              <ol className="space-y-3">
                {PLACEHOLDER_TERMS.map((t, i) => (
                  <li
                    key={i}
                    className="flex gap-4"
                    style={{ fontSize: 14, color: "var(--fg-dim)" }}
                  >
                    <span
                      className="font-mono shrink-0"
                      style={{ color: "var(--fg-mute)", paddingTop: 2 }}
                    >
                      {i + 1}.
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
              <p
                className="mt-5"
                style={{ color: "var(--fg-mute)", fontSize: 12 }}
              >
                Final terms will be in the signed agreement at enrollment.
              </p>
            </div>
            <label
              className="inline-flex items-start gap-3"
              style={{
                color: scrolledToBottom ? "var(--fg)" : "var(--fg-mute)",
                fontSize: 14,
                cursor: scrolledToBottom ? "pointer" : "not-allowed",
              }}
            >
              <input
                type="checkbox"
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
                disabled={!scrolledToBottom || submitting}
                style={{ marginTop: 3 }}
              />
              <span>
                I have read and accept the terms of the Placement Guarantee
                Program.
              </span>
            </label>
            {!scrolledToBottom && (
              <p style={{ color: "var(--fg-mute)", fontSize: 12 }}>
                Scroll to the bottom of the terms to enable acceptance.
              </p>
            )}
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
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-colors"
            style={{
              fontSize: 15,
              background: "#cc7755",
              color: "#0d1117",
              cursor: submitting || !isValid ? "not-allowed" : "pointer",
              opacity: submitting || !isValid ? 0.6 : 1,
            }}
          >
            {submitting
              ? "Opening checkout…"
              : `Pay ${fmtINR(PRICE_INR)} securely`}
          </button>

          <p
            className="text-center"
            style={{ color: "var(--fg-mute)", fontSize: 12 }}
          >
            Payments processed by Razorpay. You&apos;ll be redirected back here
            once the transaction is verified.
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
            <h2
              className="font-display"
              style={{ fontSize: 20, letterSpacing: "-0.01em" }}
            >
              {PRODUCT_NAME}
            </h2>
            <p
              className="mt-2"
              style={{
                color: "var(--fg-dim)",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {PRODUCT_TAGLINE}
            </p>

            <div
              className="my-5"
              style={{ borderTop: "1px solid var(--border)" }}
            />

            <dl className="grid grid-cols-[1fr_auto] gap-y-2.5 text-sm">
              <dt style={{ color: "var(--fg-dim)" }}>Program fee</dt>
              <dd
                className="font-mono text-right"
                style={{ color: "var(--fg)" }}
              >
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
                style={{ fontSize: 18, color: "#cc7755" }}
              >
                {fmtINR(PRICE_INR)}
              </dd>
            </dl>
            <p
              className="mt-4"
              style={{ color: "var(--fg-mute)", fontSize: 11 }}
            >
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
