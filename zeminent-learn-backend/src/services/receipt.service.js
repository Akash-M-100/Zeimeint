'use strict';

const path = require('path');
const PDFDocument = require('pdfkit');
const { PACKAGE_NAME, PACKAGE_PRICE_INR } = require('../config/product');

// Embedded brand asset. Bundled at src/assets/ so it's available in every
// environment without an extra fetch. Tiny PNG (~5-15 KB) — negligible.
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'zeminent-logo-v3.png');

// Brand palette — kept narrow on purpose. Copper accent mirrors the
// frontend's --accent-2 family so the receipt feels of-a-piece with the
// product UI without being a literal screenshot of it.
const COLOR_PRIMARY = '#0d1117';
const COLOR_ACCENT = '#cc7755';
const COLOR_MUTED = '#6b7280';
const COLOR_MUTED_2 = '#9ca3af';
const COLOR_DIVIDER = '#e5e7eb';

// Plain "Rs." prefix — pdfkit's built-in Helvetica doesn't ship the
// Devanagari rupee glyph (U+20B9) and would render it as tofu. Future
// polish slice can bundle a TTF that does.
const fmtINR = (n) =>
  `Rs. ${Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

// Razorpay method codes → human labels. Anything we don't recognise is
// title-cased (e.g. an unknown 'bnpl' renders as "Bnpl") so the receipt
// never shows a raw code string.
const formatPaymentMethod = (method) => {
  if (!method) return '—';
  const map = {
    card: 'Card',
    upi: 'UPI',
    netbanking: 'Net Banking',
    wallet: 'Wallet',
    emi: 'EMI',
    paylater: 'Pay Later',
  };
  const key = String(method).toLowerCase();
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

/**
 * Generates a single-page A4 PDF receipt as a readable stream.
 *
 * Caller is responsible for piping it to the response. The doc is closed
 * via doc.end() before return — the consumer just consumes the stream.
 *
 * @param {object} payment - Payment document (mongoose doc or .lean())
 * @param {object} user    - User document
 * @returns {PDFDocument}    Readable stream of PDF bytes
 */
const generateReceiptPdf = (payment, user) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Zeminent Learning Receipt ${payment.receiptNumber || ''}`.trim(),
      Author: 'Zeminent Learning',
      Subject: 'Payment Receipt',
    },
  });

  const pageWidth = doc.page.width;
  const leftX = 50;
  const rightX = pageWidth - 50;

  // ─── HEADER ────────────────────────────────────────────────────────────
  // Logo top-left; absolute position so the rightX text below can align
  // independently of the cursor.
  try {
    doc.image(LOGO_PATH, leftX, 50, { width: 110 });
  } catch (_e) {
    // Fallback if the bundled asset is missing in some environment —
    // never let the receipt 500 because of a static asset.
    doc.fontSize(20).fillColor(COLOR_PRIMARY).text('Zeminent Learning', leftX, 55);
  }

  // "RECEIPT" eyebrow + receipt number, right-aligned.
  doc
    .fontSize(9)
    .fillColor(COLOR_MUTED)
    .text('RECEIPT', rightX - 200, 50, { width: 200, align: 'right' });
  doc
    .fontSize(20)
    .fillColor(COLOR_PRIMARY)
    .text(payment.receiptNumber || '-', rightX - 200, 64, {
      width: 200,
      align: 'right',
    });

  // Copper divider under the header.
  const accentY = 110;
  doc
    .moveTo(leftX, accentY)
    .lineTo(rightX, accentY)
    .lineWidth(2)
    .strokeColor(COLOR_ACCENT)
    .stroke();

  // ─── METADATA STRIP ────────────────────────────────────────────────────
  doc.y = accentY + 25;
  const metaY = doc.y;
  const paidAt = payment.receiptMeta?.paidAt || payment.updatedAt;

  doc.fontSize(8).fillColor(COLOR_MUTED).text('DATE OF ISSUE', leftX, metaY);
  doc
    .fontSize(11)
    .fillColor(COLOR_PRIMARY)
    .text(paidAt ? fmtDate(paidAt) : '-', leftX, metaY + 12);

  doc
    .fontSize(8)
    .fillColor(COLOR_MUTED)
    .text('PAYMENT STATUS', leftX + 200, metaY);
  doc
    .fontSize(11)
    .fillColor(COLOR_ACCENT)
    .text('PAID', leftX + 200, metaY + 12);

  doc.y = metaY + 50;

  // ─── BILLED TO ─────────────────────────────────────────────────────────
  doc.fontSize(8).fillColor(COLOR_MUTED).text('BILLED TO', leftX);
  doc.moveDown(0.3);
  doc.fontSize(13).fillColor(COLOR_PRIMARY).text(user.name || '-');
  doc.fontSize(10).fillColor(COLOR_MUTED).text(user.email || '-');
  doc.moveDown(2);

  // ─── ITEM TABLE ────────────────────────────────────────────────────────
  doc
    .moveTo(leftX, doc.y)
    .lineTo(rightX, doc.y)
    .lineWidth(0.5)
    .strokeColor(COLOR_DIVIDER)
    .stroke();
  doc.moveDown(0.5);

  const tableHeaderY = doc.y;
  doc.fontSize(8).fillColor(COLOR_MUTED);
  doc.text('DESCRIPTION', leftX, tableHeaderY);
  doc.text('AMOUNT', rightX - 100, tableHeaderY, {
    width: 100,
    align: 'right',
  });
  doc.moveDown(0.5);

  doc
    .moveTo(leftX, doc.y)
    .lineTo(rightX, doc.y)
    .lineWidth(0.5)
    .strokeColor(COLOR_DIVIDER)
    .stroke();
  doc.moveDown(0.8);

  // Amount sourced from the payment doc; falls back to package price for
  // ancient/seeded rows that pre-date the amount field. INR-only here.
  const subtotal = Number(payment.amount) || PACKAGE_PRICE_INR;
  const itemY = doc.y;
  doc.fontSize(12).fillColor(COLOR_PRIMARY);
  doc.text(`Zeminent ${PACKAGE_NAME}`, leftX, itemY);
  doc.fontSize(9).fillColor(COLOR_MUTED).moveDown(0.2);
  doc.text('Lifetime access to all courses, certificates, and community', leftX);

  doc
    .fontSize(12)
    .fillColor(COLOR_PRIMARY)
    .text(fmtINR(subtotal), rightX - 100, itemY, {
      width: 100,
      align: 'right',
    });

  doc.moveDown(1.5);

  // ─── BREAKDOWN ─────────────────────────────────────────────────────────
  doc
    .moveTo(leftX, doc.y)
    .lineTo(rightX, doc.y)
    .lineWidth(0.5)
    .strokeColor(COLOR_DIVIDER)
    .stroke();
  doc.moveDown(0.8);

  const lineHeight = 22;
  const drawLine = (label, value, isBold = false) => {
    const y = doc.y;
    const fontSize = isBold ? 13 : 11;
    const labelColor = isBold ? COLOR_PRIMARY : COLOR_MUTED;
    const valueColor = isBold ? COLOR_PRIMARY : COLOR_MUTED_2;

    doc.fontSize(fontSize).fillColor(labelColor).text(label, leftX, y);
    doc
      .fillColor(valueColor)
      .text(value, rightX - 100, y, { width: 100, align: 'right' });
    doc.y = y + lineHeight;
  };

  drawLine('Subtotal', fmtINR(subtotal));
  drawLine('GST (0%)', fmtINR(0));

  // Heavier divider above the total row.
  doc
    .moveTo(leftX, doc.y + 2)
    .lineTo(rightX, doc.y + 2)
    .lineWidth(1)
    .strokeColor(COLOR_PRIMARY)
    .stroke();
  doc.moveDown(0.7);

  drawLine('Total', fmtINR(subtotal), true);
  doc.moveDown(2);

  // ─── PAYMENT DETAILS ───────────────────────────────────────────────────
  doc.fontSize(8).fillColor(COLOR_MUTED).text('PAYMENT METHOD', leftX);
  doc
    .fontSize(11)
    .fillColor(COLOR_PRIMARY)
    .text(formatPaymentMethod(payment.receiptMeta?.paymentMethod), leftX, doc.y + 2);
  doc.moveDown(1);

  doc.fontSize(8).fillColor(COLOR_MUTED).text('PAYMENT REFERENCE', leftX);
  doc
    .fontSize(10)
    .fillColor(COLOR_PRIMARY)
    .font('Courier')
    .text(payment.razorpayPaymentId || '—', leftX, doc.y + 2);
  doc.font('Helvetica'); // reset so the footer renders in the default family
  doc.moveDown(2);

  // ─── FOOTER ────────────────────────────────────────────────────────────
  // Pin to a fixed offset from the page bottom so it doesn't drift with
  // content above.
  const footerY = doc.page.height - 100;
  doc.y = footerY;

  doc
    .moveTo(leftX, footerY)
    .lineTo(rightX, footerY)
    .lineWidth(0.5)
    .strokeColor(COLOR_DIVIDER)
    .stroke();
  doc.moveDown(0.8);

  doc
    .fontSize(9)
    .fillColor(COLOR_PRIMARY)
    .text('Thank you for choosing Zeminent Learning.', { align: 'center' });
  doc.moveDown(0.3);
  doc
    .fontSize(8)
    .fillColor(COLOR_MUTED)
    .text('This is a digital receipt. No signature is required.', {
      align: 'center',
    });
  doc.moveDown(0.5);
  doc
    .fontSize(8)
    .fillColor(COLOR_MUTED_2)
    .text('Support: info@zeminent.com   |   learn.zeminent.com', {
      align: 'center',
    });

  doc.end();
  return doc;
};

module.exports = { generateReceiptPdf };
