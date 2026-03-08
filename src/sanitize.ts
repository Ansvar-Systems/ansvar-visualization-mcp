/**
 * Sanitization utilities for Mermaid and Markdown output.
 *
 * All user-provided text must pass through these functions before
 * being embedded in Mermaid syntax or Markdown tables. Mermaid uses
 * brackets, pipes, arrows, and quotes as structural delimiters —
 * unsanitized input causes parse failures or injection.
 */

/** Characters with syntactic meaning in Mermaid. */
const MERMAID_UNSAFE = /[\[\]\(\)|>\-=";{}\n\\#&]/g;

/** Strip characters that break Mermaid node labels or edge labels. */
export function sanitizeLabel(s: string): string {
  return s.replace(MERMAID_UNSAFE, " ").replace(/\s+/g, " ").trim();
}

/** Create a safe Mermaid node ID (alphanumeric + underscore only). */
export function sanitizeId(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+|_+$/g, "") || "node";
}

/** Escape pipe characters in Markdown table cells. */
export function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

/** Truncate a label to max length, appending "..." if truncated. */
export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

/** Wrap a Mermaid diagram in a fenced code block. */
export function mermaidBlock(content: string): string {
  return "```mermaid\n" + content + "\n```";
}

/**
 * Check for duplicate IDs after sanitization.
 * Returns an error string if duplicates found, or null if clean.
 */
export function checkDuplicateIds(ids: string[]): string | null {
  const sanitized = ids.map(sanitizeId);
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (let i = 0; i < sanitized.length; i++) {
    if (seen.has(sanitized[i])) {
      dupes.push(`"${ids[i]}" (sanitized: "${sanitized[i]}")`);
    }
    seen.add(sanitized[i]);
  }
  if (dupes.length > 0) {
    return `Duplicate node IDs after sanitization: ${dupes.join(", ")}. Use distinct alphanumeric IDs.`;
  }
  return null;
}
