// Zeminent — Course Completion Certificate
//
// Pixel-faithful recreation of the premium black / charcoal / silver reference
// artwork. Self-contained, print-ready (1123×794px ≈ A4 landscape @96dpi). Every
// text field is a prop defaulting to its {{token}}, so it renders live in React
// or as a static HTML template you string-replace in Puppeteer/PDFKit. Ships its
// own scoped CSS + inline SVG (metallic gradients, laurel badge, faceted panel) —
// no external assets.
//
// Typography uses the product's own webfonts (Geist sans + Fraunces serif, loaded
// by app/layout.js via next/font and exposed as --font-* vars on <html>).
// Palette per the reference: black #191B1F, white, metallic silver, gray border
// #D1D5DB; teal #5EEAD4 is reserved but the artwork is intentionally monochrome.

const DESIGN_W = 1123;
const DESIGN_H = 794;
const SCALE = 0.8;
export const CERT_WIDTH = Math.round(DESIGN_W * SCALE);
export const CERT_HEIGHT = Math.round(DESIGN_H * SCALE);

const BLACK = "#191B1F"; // primary black (panel + ink)
const CHARCOAL = "#2C3036"; // lighter facet
const BLACKDEEP = "#0C0D10"; // shadow facet
const INK = "#191B1F";
const MUTED = "#6B7177";
const PAPER = "#FFFFFF";
const LINE = "#D1D5DB";
const WAVE = "#E6E8EB";
const SEAL = "#C4C8CE";

/* ── background: rounded border, faceted black left panel, soft gray waves ── */
function Backdrop() {
  return (
    <svg className="zm-bg" viewBox="0 0 1123 794" preserveAspectRatio="none" aria-hidden="true">
      {/* subtle gray wave texture — top-right and bottom-left */}
      <g fill="none" stroke={WAVE} strokeWidth="1.1">
        <path d="M690 40 C 840 100, 980 150, 1095 110" />
        <path d="M700 78 C 850 135, 1000 185, 1100 150" />
        <path d="M720 116 C 860 170, 1000 220, 1100 190" />
        <path d="M735 156 C 880 205, 1010 255, 1100 230" />
        <path d="M470 720 C 600 760, 720 770, 845 735" opacity="0.7" />
        <path d="M470 752 C 610 792, 740 800, 860 765" opacity="0.7" />
      </g>

      {/* inner hairline frame on the paper */}
      <rect x="20" y="20" width="1083" height="754" rx="10" fill="none" stroke={LINE} strokeWidth="1.2" />
    </svg>
  );
}

/* ── top-right black ribbon bookmark with a 4-point sparkle star ── */
function Bookmark() {
  return (
    <svg className="zm-bookmark" viewBox="0 0 92 150" aria-hidden="true">
      <polygon points="0,0 92,0 92,150 46,118 0,150" fill={BLACK} />
      <path
        d="M46 44 C 47.5 60, 52 64.5, 68 66 C 52 67.5, 47.5 72, 46 88 C 44.5 72, 40 67.5, 24 66 C 40 64.5, 44.5 60, 46 44 Z"
        fill="#fff"
      />
    </svg>
  );
}

/* ── bottom-right embossed watermark seal (very light gray) ── */
function SealMark() {
  return (
    <svg className="zm-seal" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="none" stroke={SEAL} strokeWidth="1.4" />
      <circle cx="100" cy="100" r="80" fill="none" stroke={SEAL} strokeWidth="1" />
      <circle cx="100" cy="100" r="63" fill="none" stroke={SEAL} strokeWidth="1" />
      <path id="zm-seal-top" d="M38 100 A62 62 0 0 1 162 100" fill="none" />
      <path id="zm-seal-bot" d="M42 100 A58 58 0 0 0 158 100" fill="none" />
      <text className="zm-seal-name" fill={SEAL}>
        <textPath href="#zm-seal-top" startOffset="50%">ZEMINENT</textPath>
      </text>
      <text className="zm-seal-tag" fill={SEAL}>
        <textPath href="#zm-seal-bot" startOffset="50%">LEARN • BUILD • GROW</textPath>
      </text>
      <text x="100" y="118" className="zm-seal-z" fill={SEAL}>Z</text>
    </svg>
  );
}

/* ── info-row icons (dark line) ── */
const ico = { width: 23, height: 23, viewBox: "0 0 24 24", fill: "none", stroke: INK, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
const CalIcon = () => (<svg {...ico}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /><path d="M7 13h2M11 13h2M15 13h2M7 16.5h2M11 16.5h2" strokeWidth="1.3" /></svg>);
const ClockIcon = () => (<svg {...ico}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5l3.3 1.9" /></svg>);
const ScoreIcon = () => (<svg {...ico}><path d="M3 21h18" /><rect x="5" y="11" width="3.2" height="8" rx="1" /><rect x="10.4" y="7.5" width="3.2" height="11.5" rx="1" /><rect x="15.8" y="4" width="3.2" height="15" rx="1" /></svg>);
const IdIcon = () => (<svg {...ico}><rect x="3.5" y="3.5" width="17" height="13" rx="2" /><path d="M7 7.5h10M7 10.5h6" strokeWidth="1.3" /><path d="M9 16.5l-1.4 4 2.4-1.3 2.4 1.3-1.4-4" /><circle cx="11" cy="14" r="1.4" /></svg>);

function InfoCol({ Icon, label, value, last }) {
  return (
    <div className={`zm-info__col${last ? " zm-info__col--last" : ""}`}>
      <div className="zm-info__icon"><Icon /></div>
      <div className="zm-info__body">
        <div className="zm-info__label">{label}</div>
        <div className="zm-info__value">{value}</div>
      </div>
    </div>
  );
}

export default function Certificate({
  studentName = "{{studentName}}",
  courseName = "{{courseName}}",
  completionDate = "{{completionDate}}",
  duration = "{{duration}}",
  score = "{{score}}",
  certificateId = "{{certificateId}}",
  qrCode = "", // image src (data URI / URL); placeholder box if empty
  achievement = "You have demonstrated exceptional dedication, consistency, and hard work throughout this course.",
  quote = "Learning is the foundation of growth. Keep building, keep creating.",
  signatureName = "Zeminent",
  website = "www.zeminent.com",
}) {
  return (
    <div className="zm-cert-box">
      <div className="zm-cert" role="img" aria-label={`Certificate of completion for ${studentName}`}>
        <style>{CERT_CSS}</style>

        <Backdrop />
        {/* left faceted black panel — badge, seal + quote baked in to match reference exactly */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="zm-panel" src="/certificate-panel.png" alt="Zeminent award seal" />
        <Bookmark />
        <SealMark />

        {/* right-side QR verification card */}
        <div className="zm-verify">
          <div className="zm-qr">
            {qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrCode} alt="Certificate verification QR code" />
            ) : (
              <div className="zm-qr__ph">{"{{qrCode}}"}</div>
            )}
          </div>
          <div className="zm-verify__title">Verify Certificate</div>
          <div className="zm-verify__link">{website}/verify</div>
        </div>

        {/* central content column */}
        <div className="zm-inner">
          {/* HEADER — wordmark */}
          <div className="zm-brand">
            <span className="zm-brand__name">Zeminent</span>
          </div>
          <div className="zm-rule"><span /> <i /> <span /></div>

          {/* TITLE */}
          <h1 className="zm-title">CERTIFICATE</h1>
          <div className="zm-sub"><span /> <i /> OF COMPLETION <i /> <span /></div>

          {/* RECIPIENT */}
          <p className="zm-lede">This is proudly presented to</p>
          <div className="zm-name">{studentName}</div>
          <div className="zm-rule zm-rule--name"><span /> <i /> <span /></div>

          {/* COURSE */}
          <p className="zm-lede zm-lede--course">for successfully completing the</p>
          <div className="zm-course">{courseName}</div>

          {/* STATEMENT */}
          <p className="zm-statement">{achievement}</p>

          {/* INFO ROW */}
          <div className="zm-info">
            <InfoCol Icon={CalIcon} label="Completion Date" value={completionDate} />
            <InfoCol Icon={ClockIcon} label="Duration" value={duration} />
            <InfoCol Icon={ScoreIcon} label="Score" value={score} />
            <InfoCol Icon={IdIcon} label="Certificate ID" value={certificateId} last />
          </div>

          {/* SIGNATURE */}
          <div className="zm-sign">
            <div className="zm-sign__mark">{signatureName}</div>
            <div className="zm-sign__line" />
            <div className="zm-sign__team">Zeminent Team</div>
            <div className="zm-sign__web">{website}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CERT_CSS = `
.zm-cert-box{ width:${CERT_WIDTH}px; height:${CERT_HEIGHT}px; overflow:hidden; }
.zm-cert{
  --black:${BLACK}; --ink:${INK}; --muted:${MUTED}; --paper:${PAPER}; --line:${LINE};
  /* Certificate uses the application font — Fraunces — exclusively. All three
     vars resolve to the same Fraunces stack so every text element is Fraunces. */
  --sans: var(--font-fraunces), "Fraunces Fallback", ui-serif, Georgia, serif;
  --serif: var(--font-fraunces), "Fraunces Fallback", ui-serif, Georgia, serif;
  --mono: var(--font-fraunces), "Fraunces Fallback", ui-serif, Georgia, serif;
  position:relative; width:${DESIGN_W}px; height:${DESIGN_H}px;
  transform:scale(${SCALE}); transform-origin:top left;
  background:var(--paper); color:var(--ink); font-family:var(--sans);
  border:1px solid var(--line); border-radius:12px;
  overflow:hidden; box-sizing:border-box; -webkit-font-smoothing:antialiased;
}
.zm-cert *{ box-sizing:border-box; }
.zm-defs{ position:absolute; }
.zm-bg{ position:absolute; inset:0; width:100%; height:100%; z-index:1; }

/* decorations */
.zm-bookmark{ position:absolute; top:0; right:64px; width:92px; height:150px; z-index:3; }
.zm-panel{ position:absolute; left:0; top:0; width:429px; height:794px; z-index:2; }
.zm-seal{ position:absolute; right:48px; bottom:40px; width:160px; height:160px; z-index:2; }
.zm-seal-name{ font-family:var(--sans); font-size:17px; font-weight:700; letter-spacing:.2em; text-anchor:middle; }
.zm-seal-tag{ font-family:var(--sans); font-size:9px; font-weight:600; letter-spacing:.12em; text-anchor:middle; }
.zm-seal-z{ font-family:var(--sans); font-size:50px; font-weight:800; text-anchor:middle; letter-spacing:-.03em; }

/* right QR card */
.zm-verify{ position:absolute; right:58px; top:248px; width:150px; z-index:4; text-align:center; }
.zm-qr{ width:118px; height:118px; margin:0 auto; padding:8px; background:#fff; border:1px solid var(--line); border-radius:10px; box-shadow:0 8px 22px -10px rgba(0,0,0,.25); }
.zm-qr img{ width:100%; height:100%; display:block; image-rendering:pixelated; }
.zm-qr__ph{ width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f4f6f6; color:var(--muted); font-size:9px; }
.zm-verify__title{ font-family:var(--sans); font-size:14px; font-weight:600; color:var(--ink); margin-top:12px; }
.zm-verify__link{ font-family:var(--sans); font-size:12px; color:var(--muted); margin-top:4px; }

/* central column — pinned beside the black panel, leaving the right for QR/seal */
.zm-inner{
  position:absolute; inset:0; z-index:4;
  padding:40px 250px 30px 330px; display:flex; flex-direction:column; align-items:center; text-align:center;
}

/* header */
.zm-brand{ display:flex; align-items:center; justify-content:center; }
.zm-brand__name{ font-family:var(--sans); font-weight:800; font-size:44px; letter-spacing:-.025em; color:var(--ink); }
.zm-rule{ display:flex; align-items:center; justify-content:center; gap:12px; margin-top:14px; width:230px; }
.zm-rule span{ flex:1; height:1px; background:#cfd2d6; }
.zm-rule i{ width:7px; height:7px; background:var(--ink); transform:rotate(45deg); }
.zm-rule--name{ width:300px; margin-top:14px; }
.zm-rule--name span{ background:#cfd2d6; }

/* title */
.zm-title{
  margin:18px 0 0; font-family:var(--sans); font-weight:800; font-size:62px; line-height:.95;
  letter-spacing:.15em; color:var(--ink); padding-left:.15em;
}
.zm-sub{
  display:flex; align-items:center; justify-content:center; gap:12px; margin-top:10px;
  font-family:var(--sans); font-size:21px; font-weight:600; letter-spacing:.28em; color:var(--ink); padding-left:.28em;
}
.zm-sub span{ width:52px; height:1px; background:var(--ink); }
.zm-sub i{ width:5px; height:5px; background:var(--ink); transform:rotate(45deg); }

/* recipient — serif name */
.zm-lede{ margin:18px 0 0; font-family:var(--sans); font-size:18px; color:#3a4045; font-weight:400; }
.zm-lede--course{ font-size:17px; margin-top:14px; }
.zm-name{ font-family:var(--sans); font-weight:700; font-size:52px; line-height:1.02; color:var(--ink); margin-top:8px; letter-spacing:-.02em; white-space:nowrap; }

/* course — black pill */
.zm-course{
  display:inline-block; margin-top:12px; padding:11px 30px; border-radius:8px;
  background:var(--black); color:#fff; font-family:var(--sans); font-weight:700; font-size:23px; letter-spacing:.01em;
}

/* statement */
.zm-statement{ margin:16px auto 0; max-width:430px; font-family:var(--sans); font-size:15px; line-height:1.55; color:#3a4045; }

/* info row */
.zm-info{
  display:grid; grid-template-columns:repeat(4,auto); justify-content:center; align-items:center;
  width:100%; margin:26px auto 0;
}
.zm-info__col{ position:relative; display:flex; align-items:center; gap:8px; padding:0 13px; text-align:left; white-space:nowrap; }
.zm-info__col + .zm-info__col::before{
  content:""; position:absolute; left:0; top:2px; bottom:2px; width:1px; background:var(--line);
}
.zm-info__icon{ display:flex; }
.zm-info__label{ font-family:var(--sans); font-size:12px; font-weight:700; color:var(--ink); }
.zm-info__value{ font-family:var(--sans); font-size:11.5px; color:var(--muted); margin-top:2px; }

/* signature */
.zm-sign{ margin-top:auto; padding-top:16px; text-align:center; }
.zm-sign__mark{ font-family:var(--sans); font-weight:700; font-size:30px; line-height:1; color:var(--ink); margin-bottom:4px; }
.zm-sign__line{ height:1.5px; width:210px; margin:2px auto 8px; background:var(--ink); }
.zm-sign__team{ font-family:var(--sans); font-size:17px; font-weight:700; color:var(--ink); }
.zm-sign__web{ font-family:var(--sans); font-size:13px; color:var(--muted); margin-top:3px; }
`;
