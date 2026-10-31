const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

// Largest unit first, so "3 weeks ago" wins over "21 days ago".
const TIME_UNITS = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** 65 → "1:05", 3725 → "1:02:05". Returns "" when the duration is unknown. */
export function formatDuration(totalSeconds) {
  if (totalSeconds == null) return '';

  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const pad = (value) => String(value).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}`
    : `${minutes}:${pad(seconds % 60)}`;
}

/** 1234 → "1.2K". */
export function formatCount(count) {
  return compactNumber.format(count ?? 0);
}

/** "1 view", "1.2K views". */
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${formatCount(count)} ${count === 1 ? singular : plural}`;
}

/** A date relative to `now`: "3 days ago", "yesterday", "just now". */
export function formatRelativeDate(date, now = new Date()) {
  const secondsFromNow = (new Date(date).getTime() - now.getTime()) / 1000;

  for (const [unit, unitSeconds] of TIME_UNITS) {
    if (Math.abs(secondsFromNow) >= unitSeconds) {
      return relativeTime.format(Math.round(secondsFromNow / unitSeconds), unit);
    }
  }
  return 'just now';
}
