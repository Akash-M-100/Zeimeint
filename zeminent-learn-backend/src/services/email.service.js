'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Cache the transport across calls — creating it per-send would re-handshake
// the SMTP connection on every request.
let transport = null;

const getTransport = () => {
  if (transport) return transport;
  transport = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    // Port 465 uses implicit TLS; 587/25 negotiate via STARTTLS.
    secure: env.mail.port === 465,
    auth: {
      user: env.mail.user,
      pass: env.mail.password,
    },
  });
  return transport;
};

// Slice 14 B.3: extended with optional `attachments` (nodemailer's native
// format — array of {filename, content, contentType, ...}). All existing
// callers pass no attachments and continue to work unchanged.
const sendMail = async ({ to, subject, html, text, attachments }) => {
  try {
    await getTransport().sendMail({
      from: env.mail.from,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(attachments && attachments.length ? { attachments } : {}),
    });
  } catch (err) {
    console.error('✉️  Email send failed:', err.message);
    throw new ApiError(500, 'Email service failure');
  }
};

// Display name in the email; first name keeps it casual without leaking a
// long handle the user never set.
const displayName = (user) => {
  const first = String(user.name || '').trim().split(/\s+/)[0];
  return first || 'there';
};

const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return ch;
    }
  });

const sendVerificationEmail = async (user, plainToken) => {
  const url = `${env.mail.appUrl}/verify-email?token=${encodeURIComponent(plainToken)}`;
  const name = escapeHtml(displayName(user));

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">Verify your email</h2>
      <p>Hi ${name},</p>
      <p>Thanks for signing up for Zeminent Learning. Please confirm your email address by clicking the button below.</p>
      <p style="margin: 24px 0;">
        <a href="${url}"
           style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
          Verify Email
        </a>
      </p>
      <p style="font-size: 14px; color: #555;">
        If the button doesn't work, paste this link into your browser:
        <br />
        <span style="word-break: break-all;">${url}</span>
      </p>
      <p style="font-size: 13px; color: #777; margin-top: 24px;">
        This link expires in 24 hours. If you didn't sign up, you can safely ignore this email.
      </p>
    </div>
  `;

  const text = [
    `Hi ${displayName(user)},`,
    '',
    'Thanks for signing up for Zeminent Learning. Confirm your email by opening the link below:',
    url,
    '',
    'This link expires in 24 hours. If you did not sign up, ignore this email.',
  ].join('\n');

  await sendMail({
    to: user.email,
    subject: 'Verify your email — Zeminent Learning',
    html,
    text,
  });
};

const sendPasswordResetEmail = async (user, plainToken) => {
  const url = `${env.mail.appUrl}/reset-password?token=${encodeURIComponent(plainToken)}`;
  const name = escapeHtml(displayName(user));

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">Reset your password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset the password for your Zeminent Learning account. Click the button below to choose a new password.</p>
      <p style="margin: 24px 0;">
        <a href="${url}"
           style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
          Reset Password
        </a>
      </p>
      <p style="font-size: 14px; color: #555;">
        If the button doesn't work, paste this link into your browser:
        <br />
        <span style="word-break: break-all;">${url}</span>
      </p>
      <p style="font-size: 13px; color: #777; margin-top: 24px;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.
      </p>
    </div>
  `;

  const text = [
    `Hi ${displayName(user)},`,
    '',
    'We received a request to reset your Zeminent Learning password. Choose a new one by opening the link below:',
    url,
    '',
    "This link expires in 1 hour. If you didn't request a reset, ignore this email — your password won't change.",
  ].join('\n');

  await sendMail({
    to: user.email,
    subject: 'Reset your password — Zeminent Learning',
    html,
    text,
  });
};

/**
 * Slice 14: acknowledgment email sent once when a user submits a Placement
 * Guarantee Program lead. Fire-and-forget at the controller — failure here
 * is logged but never 5xxs the lead-create response, so the lead is still
 * captured even if SMTP is down.
 */
const sendPlacementLeadAck = async ({ to, name }) => {
  const safeName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || 'there');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">We received your interest</h2>
      <p>Hi ${safeName},</p>
      <p>Thank you for expressing interest in the <strong>Zeminent Placement Guarantee Program</strong>.</p>
      <p>Our team will reach out within <strong>48 hours</strong> to walk you through:</p>
      <ul style="line-height: 1.7;">
        <li>The 6-month placement commitment (full refund if no placement)</li>
        <li>Our hiring partner network</li>
        <li>Career mentoring &amp; interview prep</li>
        <li>Enrollment next steps</li>
      </ul>
      <p style="font-size: 14px; color: #555;">
        Have urgent questions? Reply to this email or write to
        <a href="mailto:info@zeminent.com">info@zeminent.com</a>.
      </p>
      <p style="font-size: 13px; color: #777; margin-top: 24px;">
        — The Zeminent Team
      </p>
    </div>
  `;

  const text = [
    `Hi ${safeName},`,
    '',
    'Thank you for expressing interest in the Zeminent Placement Guarantee Program.',
    '',
    'Our team will reach out within 48 hours to discuss:',
    '  - 6-month placement commitment with full refund if no placement',
    '  - Hiring partner network',
    '  - Career mentoring + interview prep',
    '  - Enrollment process',
    '',
    'Have urgent questions? Reply to this email or contact info@zeminent.com.',
    '',
    '— The Zeminent Team',
  ].join('\n');

  await sendMail({
    to,
    subject: 'We received your interest — Zeminent Placement Guarantee Program',
    html,
    text,
  });
};

/**
 * Slice 14 B.3: emails a GST tax invoice as a PDF attachment. Sent once on
 * the first paid transition (idempotency lives in the caller). Failure
 * logged but never thrown to the response path — user can re-download from
 * /api/payments/receipt/:paymentId at any time.
 */
const sendInvoice = async ({
  to,
  name,
  invoiceNumber,
  pdfBuffer,
  productName,
  amount,
}) => {
  const safeName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || 'there');
  const safeProduct = escapeHtml(productName);
  const formattedAmount = `Rs. ${Number(amount).toLocaleString('en-IN')}`;
  const safeInvoice = escapeHtml(invoiceNumber);
  // Slashes in invoice numbers (ZL/2526/00001) are filename-unsafe on
  // Windows + some inbox UIs — flatten to dashes.
  const filename = `${invoiceNumber.replace(/\//g, '-')}.pdf`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">Tax invoice attached</h2>
      <p>Hi ${safeName},</p>
      <p>Thank you for your purchase of <strong>${safeProduct}</strong>. Your tax invoice is attached to this email.</p>
      <ul style="line-height: 1.7;">
        <li><strong>Invoice number:</strong> ${safeInvoice}</li>
        <li><strong>Amount:</strong> ${formattedAmount}</li>
      </ul>
      <p style="font-size: 14px; color: #555;">
        Keep this invoice for your records. If you need GST input tax credit, share it with your tax accountant.
      </p>
      <p style="font-size: 13px; color: #777; margin-top: 24px;">
        — The Zeminent Team
      </p>
    </div>
  `;

  const text = [
    `Hi ${safeName},`,
    '',
    `Thank you for your purchase of ${productName}. Your tax invoice ${invoiceNumber} is attached.`,
    '',
    `Amount: ${formattedAmount}`,
    '',
    'Keep this invoice for your records.',
    '',
    '— The Zeminent Team',
  ].join('\n');

  await sendMail({
    to,
    subject: `Tax Invoice ${invoiceNumber} — Zeminent Learning`,
    html,
    text,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

/**
 * Slice 16.3: meeting-series invitation email. One per resolved attendee.
 * Body is plain HTML with a schedule list; the ICS payload (pre-built by
 * ics.service.buildInviteICS) is attached as text/calendar so the major
 * mail clients render an "Add to calendar" button. Caller computes the
 * Buffer once and reuses it across recipients.
 */
const sendMeetingInvite = async ({ to, name, series, occurrences, icsBuffer }) => {
  const safeName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || 'there');
  const safeTitle = escapeHtml(series.title);
  const safeDescription = series.description ? escapeHtml(series.description) : '';
  const safeUrl = escapeHtml(series.meetingUrl);

  const formatIST = (d, opts) =>
    new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...opts });

  const dateListHtml = occurrences
    .map((o) => {
      const formatted = formatIST(o.startTime, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `<li>${escapeHtml(formatted)} IST (${series.durationMinutes} min)</li>`;
    })
    .join('');

  const recordingNote = series.recordingEnabled
    ? '<p style="color: #666; font-size: 14px;">Note: This session will be recorded.</p>'
    : '';

  const bodyIntro = safeDescription
    || 'You have been invited to attend the following session(s):';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">You're invited: ${safeTitle}</h2>
      <p>Hi ${safeName},</p>
      <p>${bodyIntro}</p>

      <h3 style="margin-top: 24px; font-size: 16px;">Schedule</h3>
      <ul style="line-height: 1.7;">${dateListHtml}</ul>

      <h3 style="margin-top: 24px; font-size: 16px;">Meeting link</h3>
      <p><a href="${safeUrl}" style="color: #2563eb;">${safeUrl}</a></p>

      ${recordingNote}

      <p style="margin-top: 30px; color: #666; font-size: 13px;">
        The calendar invite is attached. Open it to add this to your
        Google Calendar, Outlook, or Apple Calendar.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #888; font-size: 12px;">
        Zeminent Learning &middot; info@zeminent.com
      </p>
    </div>
  `;

  const textLines = [
    `You're invited: ${series.title}`,
    '',
    `Hi ${name || 'there'},`,
    '',
    series.description || 'You have been invited to attend the following session(s):',
    '',
    'Schedule:',
    ...occurrences.map((o) => {
      const formatted = formatIST(o.startTime, { dateStyle: 'full', timeStyle: 'short' });
      return `  - ${formatted} IST (${series.durationMinutes} min)`;
    }),
    '',
    `Meeting link: ${series.meetingUrl}`,
  ];
  if (series.recordingEnabled) {
    textLines.push('', 'Note: This session will be recorded.');
  }
  textLines.push('', 'The calendar invite is attached.', '', '--', 'Zeminent Learning  info@zeminent.com');
  const text = textLines.join('\n');

  // Strip filename-unsafe characters (Windows + some inbox UIs reject /:?*).
  const filename = `${series.title.replace(/[^a-z0-9-_ ]/gi, '_').slice(0, 80) || 'meeting'}.ics`;

  await sendMail({
    to,
    subject: `Invitation: ${series.title}`,
    html,
    text,
    attachments: [
      {
        filename,
        content: icsBuffer,
        contentType: 'text/calendar; charset=utf-8; method=REQUEST',
      },
    ],
  });
};

/**
 * Slice 16.4: cancellation email for a meeting series. The attached ICS
 * (built by buildCancelICS) carries METHOD:CANCEL + the same UIDs as
 * the original invite, so Gmail / Outlook / Apple Calendar all remove
 * the events on import. Subject line says "Cancelled:" up front so
 * inbox previews surface that fact without opening the message.
 */
const sendMeetingCancellation = async ({ to, name, series, icsBuffer }) => {
  const safeName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || 'there');
  const safeTitle = escapeHtml(series.title);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px; color: #b91c1c;">Meeting Cancelled: ${safeTitle}</h2>
      <p>Hi ${safeName},</p>
      <p>The following meeting series has been cancelled. All upcoming
      sessions are being removed from your calendar automatically:</p>
      <p style="font-weight: 600; padding: 12px; background: #fef3c7; border-left: 3px solid #b91c1c; margin: 16px 0;">
        ${safeTitle}
      </p>
      <p>The attached calendar update will remove the events from your
      Google Calendar, Outlook, or Apple Calendar.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #888; font-size: 12px;">
        Zeminent Learning &middot; info@zeminent.com
      </p>
    </div>
  `;

  const text = [
    `Meeting Cancelled: ${series.title}`,
    '',
    `Hi ${name || 'there'},`,
    '',
    'The following meeting series has been cancelled. All upcoming sessions are being removed from your calendar.',
    '',
    'The attached calendar update will remove the events.',
    '',
    '--',
    'Zeminent Learning  info@zeminent.com',
  ].join('\n');

  const filename = `${series.title.replace(/[^a-z0-9-_ ]/gi, '_').slice(0, 80) || 'meeting'}-cancel.ics`;

  await sendMail({
    to,
    subject: `Cancelled: ${series.title}`,
    html,
    text,
    attachments: [
      {
        filename,
        content: icsBuffer,
        contentType: 'text/calendar; charset=utf-8; method=CANCEL',
      },
    ],
  });
};

/**
 * Slice 16.4: post-session recording delivery. Plain link email — no ICS
 * attachment since the meeting is done. Subject mentions "Recording" so
 * attendees can find it later via inbox search.
 */
const sendRecordingNotification = async ({ to, name, series, occurrence, recordingUrl }) => {
  const safeName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || 'there');
  const safeTitle = escapeHtml(series.title);
  const safeUrl = escapeHtml(recordingUrl);
  const idx = occurrence.occurrenceIndex ? `Session ${occurrence.occurrenceIndex}` : 'session';

  const sessionDate = new Date(occurrence.startTime).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">Recording: ${safeTitle}</h2>
      <p>Hi ${safeName},</p>
      <p>The recording from <strong>${escapeHtml(idx)}</strong> on
      ${escapeHtml(sessionDate)} IST is now available.</p>
      <p style="margin: 24px 0;">
        <a href="${safeUrl}"
           style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
          Watch Recording
        </a>
      </p>
      <p style="font-size: 13px; color: #555;">
        Or copy this link: <a href="${safeUrl}" style="color: #2563eb;">${safeUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #888; font-size: 12px;">
        Zeminent Learning &middot; info@zeminent.com
      </p>
    </div>
  `;

  const text = [
    `Recording: ${series.title}`,
    '',
    `Hi ${name || 'there'},`,
    '',
    `The recording from ${idx} on ${sessionDate} IST is now available.`,
    '',
    `Watch: ${recordingUrl}`,
    '',
    '--',
    'Zeminent Learning  info@zeminent.com',
  ].join('\n');

  await sendMail({
    to,
    subject: `Recording available: ${series.title}`,
    html,
    text,
  });
};

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPlacementLeadAck,
  sendInvoice,
  sendMeetingInvite,
  sendMeetingCancellation,
  sendRecordingNotification,
};
