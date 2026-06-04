/**
 * Generate a URL-safe slug from arbitrary text.
 *
 * Strips accents, lowercases, replaces non-alphanumerics with hyphens, and
 * collapses runs of hyphens. Empty input yields an empty string.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}
