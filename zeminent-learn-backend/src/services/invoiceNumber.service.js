'use strict';

const Counter = require('../models/counter.model');

/**
 * Indian financial year string in 4-digit YYMM-MM format (without
 * separator), e.g. April 2025 - March 2026 → '2526'.
 *
 * @param {Date} [date] for testing — defaults to now
 * @returns {string} 4-digit FY string
 */
const computeCurrentFY = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  // Indian FY runs April → March. April-onwards belongs to (year)-(year+1);
  // Jan-March belongs to (year-1)-(year).
  if (month >= 4) {
    return `${String(year).slice(-2)}${String(year + 1).slice(-2)}`;
  }
  return `${String(year - 1).slice(-2)}${String(year).slice(-2)}`;
};

/**
 * Atomically allocates the next invoice number for the current FY.
 * Format: ZL/{FY}/{padded-seq}, e.g. ZL/2526/00001.
 *
 * Uses Mongo's `findOneAndUpdate` with `$inc` + `upsert: true` so the
 * sequence is gap-free under concurrent calls. Each FY gets its own
 * counter row, naturally resetting to 1 every April 1.
 */
const getNextInvoiceNumber = async () => {
  const fy = computeCurrentFY();
  const counter = await Counter.findOneAndUpdate(
    { scope: 'INVOICE', fy },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return `ZL/${fy}/${String(counter.seq).padStart(5, '0')}`;
};

module.exports = { computeCurrentFY, getNextInvoiceNumber };
