'use strict';

// Server-side YouTube helpers. Fetching the watch page from the backend has no
// CORS restriction, so we can read a video's real length without a Data API key
// — far more reliable than reading it off a hidden browser embed player.

// Pull the 11-char video id out of any link shape the validator accepts
// (watch?v=, youtu.be/, /embed/, /shorts/), or accept a bare id.
const parseYouTubeId = (url) => {
  const s = String(url || '').trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
};

/**
 * Reads a YouTube video's duration (whole seconds) by fetching its watch page
 * and parsing the `"lengthSeconds":"…"` field embedded in the page JSON.
 * Returns 0 on any failure (bad id, network error, parse miss) so callers can
 * fall back to a client-supplied value without throwing.
 */
const fetchYouTubeDuration = async (youtubeUrl) => {
  const id = parseYouTubeId(youtubeUrl);
  if (!id) return 0;
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return 0;
    const html = await res.text();
    const m = html.match(/"lengthSeconds":"(\d+)"/);
    return m ? parseInt(m[1], 10) : 0;
  } catch {
    return 0;
  }
};

module.exports = { parseYouTubeId, fetchYouTubeDuration };
