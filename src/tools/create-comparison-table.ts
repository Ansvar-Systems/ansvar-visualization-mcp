/**
 * create_comparison_table — Side-by-side comparison of items.
 *
 * Framework comparisons, regulation overlaps, vendor feature matrices.
 */
import { escapeCell } from "../sanitize.js";

export interface ComparisonTableInput {
  title?: string;
  columns: string[];
  rows: Record<string, string>[];
}

export function createComparisonTable(input: ComparisonTableInput): string {
  const parts: string[] = [];
  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }

  // Header
  parts.push("| " + input.columns.map((c) => `**${escapeCell(c)}**`).join(" | ") + " |");
  parts.push("| " + input.columns.map(() => "---").join(" | ") + " |");

  // Rows
  for (const row of input.rows) {
    const cells = input.columns.map((col) => escapeCell(row[col] ?? ""));
    parts.push("| " + cells.join(" | ") + " |");
  }

  return parts.join("\n");
}

export const CREATE_COMPARISON_TABLE_TOOL = {
  name: "create_comparison_table",
  description:
    "Create a formatted comparison table. Use for framework comparisons, regulation overlaps, feature matrices, side-by-side analysis.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      columns: { type: "array", items: { type: "string" }, description: "Column headers" },
      rows: {
        type: "array",
        items: { type: "object", description: "Row data keyed by column name" },
        description: "Table rows",
      },
    },
    required: ["columns", "rows"],
  },
};
