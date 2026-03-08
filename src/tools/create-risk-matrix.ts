/**
 * create_risk_matrix — 5x5 likelihood/impact risk matrix.
 *
 * Deterministic grid layout. LLMs consistently mangle freehand risk
 * matrices — this tool guarantees correct cell placement, color coding,
 * and risk ID labeling.
 */
import { escapeCell } from "../sanitize.js";

export interface Risk {
  id: string;
  label: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
}

export interface RiskMatrixInput {
  title?: string;
  likelihood_labels?: string[];
  impact_labels?: string[];
  risks: Risk[];
}

const DEFAULT_LIKELIHOOD = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const DEFAULT_IMPACT = ["Negligible", "Minor", "Moderate", "Major", "Critical"];

// Risk level by score (likelihood * impact)
function riskLevel(score: number): { level: string; indicator: string } {
  if (score >= 15) return { level: "Critical", indicator: "\u{1F534}" }; // red circle
  if (score >= 10) return { level: "High", indicator: "\u{1F7E0}" }; // orange circle
  if (score >= 5) return { level: "Medium", indicator: "\u{1F7E1}" }; // yellow circle
  return { level: "Low", indicator: "\u{1F7E2}" }; // green circle
}

export function createRiskMatrix(input: RiskMatrixInput): string {
  const likLabels = input.likelihood_labels ?? DEFAULT_LIKELIHOOD;
  const impLabels = input.impact_labels ?? DEFAULT_IMPACT;
  const parts: string[] = [];

  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }

  // Build the 5x5 grid
  // Rows: likelihood (5 = top, 1 = bottom)
  // Columns: impact (1 = left, 5 = right)

  // Header row
  const header = ["**Likelihood \\\\ Impact**", ...impLabels.map((l) => `**${escapeCell(l)}**`)];
  parts.push("| " + header.join(" | ") + " |");
  parts.push("| " + header.map(() => "---").join(" | ") + " |");

  // Build risk placement map: (likelihood, impact) → risk IDs
  const placement = new Map<string, string[]>();
  for (const risk of input.risks) {
    const lik = Math.min(Math.max(risk.likelihood, 1), 5);
    const imp = Math.min(Math.max(risk.impact, 1), 5);
    const key = `${lik}-${imp}`;
    const list = placement.get(key) ?? [];
    list.push(risk.id);
    placement.set(key, list);
  }

  // Rows from highest likelihood to lowest
  for (let lik = 5; lik >= 1; lik--) {
    const cells: string[] = [`**${escapeCell(likLabels[lik - 1])}**`];

    for (let imp = 1; imp <= 5; imp++) {
      const key = `${lik}-${imp}`;
      const risksInCell = placement.get(key);
      const score = lik * imp;
      const { indicator } = riskLevel(score);

      if (risksInCell && risksInCell.length > 0) {
        cells.push(`${indicator} ${risksInCell.join(", ")}`);
      } else {
        cells.push(indicator);
      }
    }

    parts.push("| " + cells.join(" | ") + " |");
  }

  // Risk register summary
  if (input.risks.length > 0) {
    parts.push("\n**Risk Register:**\n");
    parts.push("| ID | Risk | L | I | Score | Level |");
    parts.push("| --- | --- | --- | --- | --- | --- |");

    const sorted = [...input.risks].sort(
      (a, b) => b.likelihood * b.impact - a.likelihood * a.impact
    );
    for (const risk of sorted) {
      const score = risk.likelihood * risk.impact;
      const { level, indicator } = riskLevel(score);
      parts.push(
        `| ${escapeCell(risk.id)} | ${escapeCell(risk.label)} | ${risk.likelihood} | ${risk.impact} | ${score} | ${indicator} ${level} |`
      );
    }
  }

  return parts.join("\n");
}

export const CREATE_RISK_MATRIX_TOOL = {
  name: "create_risk_matrix",
  description:
    "Create a 5x5 risk matrix (likelihood vs impact) with risk placement, color-coded cells, and a sorted risk register. Deterministic layout — no LLM syntax errors. Use for risk assessments, threat analysis output, gap analysis scoring.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      likelihood_labels: {
        type: "array",
        items: { type: "string" },
        description: "5 labels from lowest to highest (default: Rare → Almost Certain)",
      },
      impact_labels: {
        type: "array",
        items: { type: "string" },
        description: "5 labels from lowest to highest (default: Negligible → Critical)",
      },
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Risk identifier (e.g., R-001)" },
            label: { type: "string", description: "Short risk description" },
            likelihood: { type: "number", description: "1-5 score" },
            impact: { type: "number", description: "1-5 score" },
          },
          required: ["id", "label", "likelihood", "impact"],
        },
      },
    },
    required: ["risks"],
  },
};
