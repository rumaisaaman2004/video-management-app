// Rules for how playback starts, kept free of the player so they are easy to test.

const QUALITY_STORAGE_KEY = 'preferred-quality';
// On small screens a lower quality looks the same and loads faster.
const SMALL_SCREEN_WIDTH = 768;
const SMALL_SCREEN_MAX_HEIGHT = 480;
// Don't resume a few seconds in, or right before the end: start from the beginning instead.
const MIN_RESUME_SECONDS = 5;
const END_MARGIN_SECONDS = 10;

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const PROGRESS_SAVE_INTERVAL_MS = 10_000;

export function readPreferredQuality() {
  try {
    return localStorage.getItem(QUALITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function savePreferredQuality(label) {
  try {
    localStorage.setItem(QUALITY_STORAGE_KEY, label);
  } catch {
    // Not remembered next time, but the switch itself still works.
  }
}

/** The short side of a rendition, which is what its "720p"-style label refers to. */
function qualityHeight(rendition) {
  return Math.min(rendition.width, rendition.height);
}

/**
 * Which rendition to start with: the viewer's saved choice if this video has it,
 * otherwise the best quality (capped at 480p on small screens).
 * `renditions` are ordered from lowest to highest quality.
 */
export function pickInitialQuality(renditions, { preferredLabel, viewportWidth }) {
  const preferred = renditions.find((rendition) => rendition.label === preferredLabel);
  if (preferred) return preferred;

  if (viewportWidth < SMALL_SCREEN_WIDTH) {
    const fitting = renditions.filter((r) => qualityHeight(r) <= SMALL_SCREEN_MAX_HEIGHT);
    if (fitting.length > 0) return fitting.at(-1);
  }
  return renditions.at(-1);
}

/** Where to start playing, given the saved position: 0 means from the beginning. */
export function resumePosition(savedSeconds, durationSeconds) {
  if (!savedSeconds || savedSeconds < MIN_RESUME_SECONDS) return 0;
  if (durationSeconds && savedSeconds > durationSeconds - END_MARGIN_SECONDS) return 0;
  return savedSeconds;
}
