/**
 * create_comparison_matrix — Weighted scoring across N options × M criteria.
 *
 * Vendor selection, framework selection, technology evaluation.
 * Different from comparison_table: this one has weighted scoring with totals.
 */
import { escapeCell } from "../sanitize.js";

export interface MatrixOption {
  id: string;
  label: string;
}

export interface MatrixCriterion {
  name: string;
  weight: number; // 0-1
}

export interface MatrixScore {
  option: string;
  criterion: string;
  score: number; // 0-10
  notes?: string;
}

export interface ComparisonMatrixInput {
  title?: string;
  options: MatrixOption[];
  criteria: MatrixCriterion[];
  scores: MatrixScore[];
}

export function createComparisonMatrix(input: ComparisonMatrixInput): string {
  const parts: string[] = [];
  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }

  // Build score lookup: option → criterion → score
  const scoreLookup = new Map<string, Map<string, MatrixScore>>();
  for (const s of input.scores) {
    if (!scoreLookup.has(s.option)) {
      scoreLookup.set(s.option, new Map());
    }
    scoreLookup.get(s.option)!.set(s.criterion, s);
  }

  // Header: Criteria | Weight | Option1 | Option2 | ...
  const optHeaders = input.options.map((o) => `**${escapeCell(o.label)}**`);
  parts.push("| **Criterion** | **Weight** | " + optHeaders.join(" | ") + " |");
  parts.push("| --- | :---: | " + input.options.map(() => ":---:").join(" | ") + " |");

  // Rows: one per criterion
  for (const crit of input.criteria) {
    const weightPct = `${Math.round(crit.weight * 100)}%`;
    const cells: string[] = [escapeCell(crit.name), weightPct];

    for (const opt of input.options) {
      const entry = scoreLookup.get(opt.id)?.get(crit.name);
      if (entry) {
        const weighted = (entry.score * crit.weight).toFixed(1);
        cells.push(`${entry.score}/10 (${weighted})`);
      } else {
        cells.push("—");
      }
    }

    parts.push("| " + cells.join(" | ") + " |");
  }

  // Totals row
  const totalCells: string[] = ["**Weighted Total**", ""];
  for (const opt of input.options) {
    let total = 0;
    for (const crit of input.criteria) {
      const entry = scoreLookup.get(opt.id)?.get(crit.name);
      if (entry) {
        total += entry.score * crit.weight;
      }
    }
    totalCells.push(`**${total.toFixed(1)}**`);
  }
  parts.push("| " + totalCells.join(" | ") + " |");

  // Winner
  let bestScore = -1;
  let bestOption = "";
  for (const opt of input.options) {
    let total = 0;
    for (const crit of input.criteria) {
      const entry = scoreLookup.get(opt.id)?.get(crit.name);
      if (entry) total += entry.score * crit.weight;
    }
    if (total > bestScore) {
      bestScore = total;
      bestOption = opt.label;
    }
  }
  if (bestOption) {
    parts.push(`\n> **Recommendation:** ${bestOption} scores highest at ${bestScore.toFixed(1)} weighted points.`);
  }

  // Notes
  const withNotes = input.scores.filter((s) => s.notes);
  if (withNotes.length > 0) {
    parts.push("\n**Notes:**\n");
    for (const s of withNotes) {
      const optLabel = input.options.find((o) => o.id === s.option)?.label ?? s.option;
      parts.push(`- **${optLabel}** / ${s.criterion}: ${s.notes}`);
    }
  }

  return parts.join("\n");
}

export const CREATE_COMPARISON_MATRIX_TOOL = {
  name: "create_comparison_matrix",
  description:
    "Create a weighted scoring matrix for N options across M criteria with automatic totals and recommendation. Use for vendor selection, framework comparison, technology evaluation.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      options: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" }, label: { type: "string" } },
          required: ["id", "label"],
        },
      },
      criteria: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            weight: { type: "number", description: "Weight 0-1 (e.g., 0.3 = 30%)" },
          },
          required: ["name", "weight"],
        },
      },
      scores: {
        type: "array",
        items: {
          type: "object",
          properties: {
            option: { type: "string" },
            criterion: { type: "string" },
            score: { type: "number", description: "Score 0-10" },
            notes: { type: "string" },
          },
          required: ["option", "criterion", "score"],
        },
      },
    },
    required: ["options", "criteria", "scores"],
  },
};
