'use strict';

// Slice 14 B.1: product config evolved from a single-SKU constants module
// to a SKU map + GST helpers + seller config.
//
// All prices are GST-inclusive (the customer pays the listed rupee number).
// Tax breakdown is derived by computeInclusiveGST below.
//
// HSN/SAC 999293 = Online educational services.

const PRODUCTS = {
  FULL_ACCESS: {
    sku: 'full_access',
    name: 'Full Access',
    description:
      'Lifetime access to all courses, certificates, and community',
    priceINR: 39999,
    gstRate: 18,
    hsnSacCode: '999293',
  },
  PLACEMENT_PROGRAM: {
    sku: 'placement_program',
    name: 'Placement Guarantee Program',
    description:
      'Career placement program with 6-month guarantee and full refund policy',
    priceINR: 249999,
    gstRate: 18,
    hsnSacCode: '999293',
    refundWindowMonths: 6,
  },
};

/**
 * Lookup a product by SKU. Throws on unknown SKU — callers should validate
 * input before calling, but this guards against silently writing 'unknown'
 * into a Payment.productType.
 */
const getProduct = (sku) => {
  if (sku === 'full_access') return PRODUCTS.FULL_ACCESS;
  if (sku === 'placement_program') return PRODUCTS.PLACEMENT_PROGRAM;
  throw new Error(`Unknown product SKU: ${sku}`);
};

/**
 * For inclusive GST pricing, derives the breakdown that satisfies:
 *   totalAmount = taxableValue + totalTax
 *   tax/100 = totalTax / taxableValue
 *
 * Implementation note: taxableValue is rounded once; totalTax is then
 * computed as `totalAmount - taxableValue` so the invariant
 * `taxableValue + totalTax === totalAmount` holds EXACTLY in rupees with
 * no drift. CGST/SGST split is intra-state; IGST is inter-state.
 *
 * @param {{ totalAmount:number, rate?:number, sellerStateCode:string, buyerStateCode:string }} args
 * @returns {{ taxableValue, rate, totalTax, cgst, sgst, igst }}
 */
const computeInclusiveGST = ({
  totalAmount,
  rate = 18,
  sellerStateCode,
  buyerStateCode,
}) => {
  const taxableValueExact = totalAmount / (1 + rate / 100);
  // Math.floor (not Math.round) so the off-by-one absorbed by totalTax is
  // always in the seller's tax-collection favour — audit-safer than
  // potentially under-collecting on a .50+ rupee fractional case.
  const taxableValue = Math.floor(taxableValueExact);
  // Derive totalTax from the invariant rather than recomputing to avoid drift.
  const totalTax = totalAmount - taxableValue;

  const intraState = sellerStateCode === buyerStateCode;

  return {
    taxableValue,
    rate,
    totalTax,
    cgst: intraState ? Math.round(totalTax / 2) : 0,
    // sgst absorbs the off-by-one so cgst+sgst === totalTax exactly.
    sgst: intraState ? totalTax - Math.round(totalTax / 2) : 0,
    igst: intraState ? 0 : totalTax,
  };
};

/**
 * Reads seller-identity env vars (GSTIN, legal name, registered address)
 * needed on every tax invoice. Fail-fast on startup if any required var is
 * missing — otherwise an invoice would issue with placeholder seller info,
 * which is a compliance problem.
 *
 * Called lazily so importing this module in code paths that don't need
 * the seller (e.g. unit tests of computeInclusiveGST) doesn't crash.
 */
const getSellerConfig = () => {
  const required = [
    'SELLER_LEGAL_NAME',
    'SELLER_GSTIN',
    'SELLER_STATE_CODE',
    'SELLER_STATE',
    'SELLER_ADDRESS_LINE_1',
    'SELLER_CITY',
    'SELLER_PINCODE',
  ];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length) {
    throw new Error(
      `Missing required SELLER_* env vars: ${missing.join(', ')}`,
    );
  }
  return {
    legalName: process.env.SELLER_LEGAL_NAME,
    gstin: process.env.SELLER_GSTIN,
    stateCode: process.env.SELLER_STATE_CODE,
    state: process.env.SELLER_STATE,
    address: {
      line1: process.env.SELLER_ADDRESS_LINE_1,
      line2: process.env.SELLER_ADDRESS_LINE_2 || '',
      city: process.env.SELLER_CITY,
      district: process.env.SELLER_DISTRICT || '',
      pincode: process.env.SELLER_PINCODE,
    },
  };
};

// ─── Backwards-compat exports ──────────────────────────────────────────
// Existing code in payment.service.js still imports PACKAGE_NAME +
// PACKAGE_PRICE_INR from this module. Kept as aliases pointing at the
// Full Access entry so the old code path keeps working until B.2 migrates
// it to the SKU-aware createOrder.
const PACKAGE_NAME = PRODUCTS.FULL_ACCESS.name;
const PACKAGE_PRICE_INR = PRODUCTS.FULL_ACCESS.priceINR;
const PACKAGE_PRICE_PAISE = PACKAGE_PRICE_INR * 100;
const PACKAGE_CURRENCY = 'INR';

module.exports = {
  PRODUCTS,
  getProduct,
  computeInclusiveGST,
  getSellerConfig,
  // legacy
  PACKAGE_NAME,
  PACKAGE_PRICE_INR,
  PACKAGE_PRICE_PAISE,
  PACKAGE_CURRENCY,
};
