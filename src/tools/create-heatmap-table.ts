/**
 * create_heatmap_table — Color-coded value grid.
 *
 * CVSS scoring tables, control coverage gaps, maturity heat maps,
 * multi-framework compliance overview.
 */
import { escapeCell } from "../sanitize.js";

export interface HeatmapInput {
  title?: string;
  rows: string[];
  columns: string[];
  values: number[][];
  scale?: { min: number; max: number; low_label?: string; high_label?: string };
  format?: "percentage" | "score" | "count";
}

function heatIndicator(value: number, min: number, max: number): string {
  const range = max - min || 1;
  const normalized = (value - min) / range;

  if (normalized >= 0.8) return "\u{1F7E2}"; // green
  if (normalized >= 0.6) return "\u{1F7E1}"; // yellow
  if (normalized >= 0.4) return "\u{1F7E0}"; // orange
  if (normalized >= 0.2) return "\u{1F534}"; // red
  return "\u26AB"; // black circle
}

function formatValue(value: number, format?: string): string {
  switch (format) {
    case "percentage":
      return `${Math.round(value)}%`;
    case "score":
      return value.toFixed(1);
    case "count":
      return String(Math.round(value));
    default:
      return String(value);
  }
}

export function createHeatmapTable(input: HeatmapInput): string {
  const min = input.scale?.min ?? 0;
  const max = input.scale?.max ?? Math.max(...input.values.flat(), 1);
  const parts: string[] = [];

  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }

  // Header
  const headers = ["", ...input.columns.map((c) => `**${escapeCell(c)}**`)];
  parts.push("| " + headers.join(" | ") + " |");
  parts.push("| --- | " + input.columns.map(() => ":---:").join(" | ") + " |");

  // Rows
  for (let i = 0; i < input.rows.length; i++) {
    const rowValues = input.values[i] ?? [];
    const cells: string[] = [`**${escapeCell(input.rows[i])}**`];

    for (let j = 0; j < input.columns.length; j++) {
      const val = rowValues[j] ?? 0;
      const indicator = heatIndicator(val, min, max);
      cells.push(`${indicator} ${formatValue(val, input.format)}`);
    }

    parts.push("| " + cells.join(" | ") + " |");
  }

  // Legend
  const lowLabel = input.scale?.low_label ?? "Low";
  const highLabel = input.scale?.high_label ?? "High";
  parts.push(
    `\n**Scale:** \u26AB ${lowLabel} → \u{1F534} → \u{1F7E0} → \u{1F7E1} → \u{1F7E2} ${highLabel}`
  );

  return parts.join("\n");
}

export const CREATE_HEATMAP_TABLE_TOOL = {
  name: "create_heatmap_table",
  description:
    "Create a color-coded heatmap table with values and indicators. Use for CVSS scoring, control coverage gaps, maturity heat maps, multi-framework compliance overview.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      rows: { type: "array", items: { type: "string" }, description: "Row labels" },
      columns: { type: "array", items: { type: "string" }, description: "Column labels" },
      values: {
        type: "array",
        items: { type: "array", items: { type: "number" } },
        description: "2D array of values (rows x columns)",
      },
      scale: {
        type: "object",
        properties: {
          min: { type: "number" },
          max: { type: "number" },
          low_label: { type: "string" },
          high_label: { type: "string" },
        },
      },
      format: { type: "string", enum: ["percentage", "score", "count"] },
    },
    required: ["rows", "columns", "values"],
  },
};
