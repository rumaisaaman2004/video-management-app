/**
 * Converts text into a URL-friendly slug: "Café & Web Basics" → "cafe-web-basics".
 * Returns an empty string when nothing usable remains (e.g. only symbols).
 */
export function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents left over by NFKD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
