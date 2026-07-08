'use strict';

const PDFDocument = require('pdfkit');
const { ToWords } = require('to-words');
const { getSellerConfig, getProduct } = require('../config/product');

// Slice 14 B.3: GST-compliant tax invoice generator. Replaces the legacy
// receipt.service.js for new payments. Output buffer is uploaded to S3
// once (immutable audit artifact) and streamed on download; the regen
// fallback in the controller calls this again only when the S3 fetch
// fails or the key isn't set yet.
//
// Layout follows a conventional Indian GST tax invoice:
//   - TAX INVOICE eyebrow + invoice number + date (top-right)
//   - Seller block (legal name, address, GSTIN)
//   - Accent rule
//   - BILL TO block + place of supply
//   - Item table with HSN/SAC, qty, rate, amount
//   - Totals: Taxable Value → (IGST | CGST+SGST combined) → Total
//   - Amount in words
//   - Payment details (method, reference, date)
//   - Centered footer

const toWords = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: true,
    doNotAddOnly: false,
    currencyOptions: {
      name: 'Rupee',
      plural: 'Rupees',
      symbol: '₹',
      fractionalUnit: { name: 'Paisa', plural: 'Paise', symbol: '' },
    },
  },
});

// pdfkit's built-in Helvetica doesn't ship the Devanagari rupee codepoint
// — Slice 12's polished receipt established the same Rs. prefix convention,
// keeping currency formatting consistent across both PDF surfaces.
const fmtINR = (n) => `Rs. ${Number(n).toLocaleString('en-IN')}`;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const amountInWords = (amount) => toWords.convert(amount);

// Razorpay method codes → human labels. Anything we don't recognise comes
// through uppercase so the receipt never shows a raw lowercase code.
const formatPaymentMethod = (method) => {
  if (!method) return '—';
  const map = {
    card: 'Card',
    upi: 'UPI',
    netbanking: 'Net Banking',
    wallet: 'Wallet',
    emi: 'EMI',
  };
  return map[String(method).toLowerCase()] || String(method).toUpperCase();
};

const buildHeader = (doc, seller, invoiceNumber, invoiceDate) => {
  doc
    .fontSize(9)
    .fillColor('#999')
    .text('TAX INVOICE', 50, 50, { characterSpacing: 1, align: 'left' });
  doc
    .fontSize(9)
    .fillColor('#999')
    .text(`Invoice No: ${invoiceNumber}`, 0, 50, { align: 'right' });
  doc
    .fontSize(9)
    .fillColor('#999')
    .text(`Date: ${fmtDate(invoiceDate)}`, 0, 65, { align: 'right' });

  // Seller block (text-only — no logo, follows spec option B).
  doc.fontSize(16).fillColor('#000').text(seller.legalName, 50, 90);
  doc.fontSize(9).fillColor('#444').text(seller.address.line1, 50);
  if (seller.address.line2) doc.text(seller.address.line2);
  const districtSuffix = seller.address.district ? `, ${seller.address.district}` : '';
  doc.text(`${seller.address.city}${districtSuffix} - ${seller.address.pincode}`);
  doc.text(seller.state);
  doc.text(`GSTIN: ${seller.gstin}`);

  // Copper accent rule under the seller block.
  doc
    .moveTo(50, 175)
    .lineTo(545, 175)
    .strokeColor('#cc7755')
    .lineWidth(1)
    .stroke();
};

const buildBilledTo = (doc, payment, startY = 200) => {
  const b = payment.billingAddress || {};
  doc
    .fontSize(9)
    .fillColor('#999')
    .text('BILL TO', 50, startY, { characterSpacing: 1 });
  doc.fontSize(11).fillColor('#000').text(b.name || '—', 50, startY + 15);
  doc.fontSize(9).fillColor('#444').text(b.line1 || '—', 50);
  if (b.line2) doc.text(b.line2);
  doc.text(
    `${b.city || '—'}, ${b.state || '—'} - ${b.pincode || '—'}`,
  );
  if (payment.buyerGSTIN) doc.text(`GSTIN: ${payment.buyerGSTIN}`);

  doc.moveDown();
  doc
    .fontSize(9)
    .fillColor('#000')
    .text(
      `Place of Supply: ${b.state || '—'} (${payment.placeOfSupply || '—'})`,
      50,
    );
};

const buildItemTable = (doc, payment, product, startY = 310) => {
  // Header row.
  doc.fontSize(8).fillColor('#999');
  doc.text('#', 50, startY);
  doc.text('DESCRIPTION', 80, startY);
  doc.text('HSN/SAC', 320, startY);
  doc.text('QTY', 380, startY);
  doc.text('RATE', 415, startY);
  doc.text('AMOUNT', 490, startY, { align: 'right', width: 55 });
  doc
    .moveTo(50, startY + 12)
    .lineTo(545, startY + 12)
    .strokeColor('#ddd')
    .lineWidth(0.5)
    .stroke();

  // Single item row.
  const rowY = startY + 20;
  doc.fontSize(9).fillColor('#000').text('1', 50, rowY);
  doc.text(product.name, 80, rowY, { width: 230 });
  doc
    .fontSize(9)
    .fillColor('#444')
    .text(product.description, 80, rowY + 14, { width: 230 });
  doc
    .fontSize(9)
    .fillColor('#000')
    .text(payment.hsnSacCode || '999293', 320, rowY);
  doc.text('1', 380, rowY);
  doc.text(fmtINR(payment.tax.taxableValue), 415, rowY);
  doc.text(fmtINR(payment.tax.taxableValue), 490, rowY, {
    align: 'right',
    width: 55,
  });

  return rowY + 60; // Y position after the item row + description spacing
};

const buildTotals = (doc, payment, startY) => {
  const labelX = 360;
  const valueX = 490;
  const valueWidth = 55;

  doc.fontSize(9).fillColor('#444').text('Taxable Value', labelX, startY);
  doc
    .fillColor('#000')
    .text(fmtINR(payment.tax.taxableValue), valueX, startY, {
      align: 'right',
      width: valueWidth,
    });

  let y = startY + 18;
  if (payment.tax.igst > 0) {
    // Inter-state: single IGST line
    doc.fillColor('#444').text(`IGST @ ${payment.tax.rate}%`, labelX, y);
    doc.fillColor('#000').text(fmtINR(payment.tax.igst), valueX, y, {
      align: 'right',
      width: valueWidth,
    });
    y += 18;
  } else {
    // Intra-state: combined CGST+SGST line (each half-rate)
    doc
      .fillColor('#444')
      .text(
        `GST @ ${payment.tax.rate}% (CGST ${payment.tax.rate / 2}% + SGST ${payment.tax.rate / 2}%)`,
        labelX,
        y,
      );
    doc.fillColor('#000').text(fmtINR(payment.tax.totalTax), valueX, y, {
      align: 'right',
      width: valueWidth,
    });
    y += 18;
  }

  // Total — heavier rule + bigger font.
  doc.moveTo(labelX, y + 4).lineTo(545, y + 4).strokeColor('#000').lineWidth(0.8).stroke();
  y += 12;
  doc.fontSize(11).fillColor('#000').text('Total', labelX, y);
  doc.text(fmtINR(payment.amount), valueX, y, {
    align: 'right',
    width: valueWidth,
  });
  y += 25;

  doc
    .fontSize(9)
    .fillColor('#444')
    .text(`Amount in words: ${amountInWords(payment.amount)}`, 50, y, {
      width: 495,
    });

  return y + 30;
};

const buildPaymentDetails = (doc, payment, startY) => {
  doc
    .fontSize(8)
    .fillColor('#999')
    .text('PAYMENT DETAILS', 50, startY, { characterSpacing: 1 });

  const dy = startY + 15;
  doc.fontSize(9).fillColor('#444').text('Payment Method:', 50, dy);
  doc
    .fillColor('#000')
    .text(formatPaymentMethod(payment.receiptMeta?.paymentMethod), 150, dy);

  doc.fillColor('#444').text('Payment Reference:', 50, dy + 15);
  doc
    .fillColor('#000')
    .font('Courier')
    .text(payment.razorpayPaymentId || '—', 150, dy + 15)
    .font('Helvetica');

  doc.fillColor('#444').text('Payment Date:', 50, dy + 30);
  doc
    .fillColor('#000')
    .text(
      fmtDate(payment.receiptMeta?.paidAt || payment.updatedAt),
      150,
      dy + 30,
    );

  return dy + 60;
};

const buildFooter = (doc) => {
  const y = doc.page.height - 80;
  doc
    .fontSize(8)
    .fillColor('#999')
    .text(
      'This is a digitally signed invoice. No physical signature is required.',
      50,
      y,
      { width: 495, align: 'center' },
    );
  doc.text('For queries: info@zeminent.com   |   learn.zeminent.com', 50, y + 20, {
    width: 495,
    align: 'center',
  });
};

/**
 * Generates a tax invoice PDF as a Buffer. The buffer is what gets uploaded
 * to S3 and attached to the invoice email. Resolves on stream `end`; the
 * pdfkit doc internals throw via the `error` event.
 *
 * @param {object} payment - Payment doc with invoiceNumber, tax, billingAddress
 * @returns {Promise<Buffer>}
 */
const generateInvoiceBuffer = (payment) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const seller = getSellerConfig();
    const product = getProduct(payment.productType);

    buildHeader(
      doc,
      seller,
      payment.invoiceNumber,
      payment.invoiceIssuedAt || new Date(),
    );
    buildBilledTo(doc, payment);
    const yAfterItems = buildItemTable(doc, payment, product);
    const yAfterTotals = buildTotals(doc, payment, yAfterItems);
    buildPaymentDetails(doc, payment, yAfterTotals);
    buildFooter(doc);

    doc.end();
  });

module.exports = { generateInvoiceBuffer, amountInWords, formatPaymentMethod };
