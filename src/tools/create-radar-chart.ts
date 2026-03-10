/**
 * create_radar_chart — Maturity assessment / gap analysis scoring.
 *
 * Mermaid has no native radar chart. This produces:
 * 1. A formatted markdown table with visual bar indicators
 * 2. A Mermaid xychart-beta bar chart as visual approximation
 *
 * Used for NIS2/ISO 27001 maturity scoring, risk domain assessment,
 * ASVS level coverage, framework readiness.
 */
import { escapeCell, mermaidBlock, sanitizeLabel } from "../sanitize.js";
import { assertFiniteNumber, assertNonEmptyArray } from "./validation.js";

export interface RadarDimension {
  name: string;
  current: number;
  target?: number;
}

export interface RadarChartInput {
  title: string;
  dimensions: RadarDimension[];
  scale_max?: number;
}

const BAR_FULL = "\u2588";
const BAR_EMPTY = "\u2591";

function renderBar(value: number, max: number, width: number = 10): string {
  const filled = Math.round((value / max) * width);
  return BAR_FULL.repeat(filled) + BAR_EMPTY.repeat(width - filled);
}

export function createRadarChart(input: RadarChartInput): string {
  const max = input.scale_max ?? 5;
  assertFiniteNumber("scale_max", max);
  if (max <= 0) {
    throw new Error("scale_max must be greater than 0.");
  }
  assertNonEmptyArray("dimensions", input.dimensions);
  for (const dimension of input.dimensions) {
    assertFiniteNumber(`dimension ${dimension.name} current`, dimension.current);
    if (dimension.current < 0 || dimension.current > max) {
      throw new Error(`dimension ${dimension.name} current must be between 0 and ${max}.`);
    }
    if (dimension.target !== undefined) {
      assertFiniteNumber(`dimension ${dimension.name} target`, dimension.target);
      if (dimension.target < 0 || dimension.target > max) {
        throw new Error(`dimension ${dimension.name} target must be between 0 and ${max}.`);
      }
    }
  }

  const parts: string[] = [];

  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }

  // Markdown table with visual bars
  const hasTarget = input.dimensions.some((d) => d.target !== undefined);
  const headers = hasTarget
    ? ["Domain", "Current", "Target", "Gap", ""]
    : ["Domain", "Score", ""];

  parts.push("| " + headers.join(" | ") + " |");
  parts.push("| " + headers.map(() => "---").join(" | ") + " |");

  for (const dim of input.dimensions) {
    const bar = renderBar(dim.current, max);
    if (hasTarget) {
      const target = dim.target ?? max;
      const gap = target - dim.current;
      const gapStr = gap > 0 ? `-${gap.toFixed(1)}` : "Met";
      parts.push(
        `| ${escapeCell(dim.name)} | ${dim.current}/${max} | ${target}/${max} | ${gapStr} | ${bar} |`
      );
    } else {
      parts.push(`| ${escapeCell(dim.name)} | ${dim.current}/${max} | ${bar} |`);
    }
  }

  // Mermaid bar chart approximation
  const chartLines: string[] = ["xychart-beta"];
  chartLines.push(`  title "${sanitizeLabel(input.title)}"`);

  const labels = input.dimensions.map((d) => `"${sanitizeLabel(d.name)}"`);
  chartLines.push(`  x-axis [${labels.join(", ")}]`);
  chartLines.push(`  y-axis "Score" 0 --> ${max}`);

  const currentValues = input.dimensions.map((d) => d.current);
  chartLines.push(`  bar [${currentValues.join(", ")}]`);

  if (hasTarget) {
    const targetValues = input.dimensions.map((d) => d.target ?? max);
    chartLines.push(`  line [${targetValues.join(", ")}]`);
  }

  parts.push("\n" + mermaidBlock(chartLines.join("\n")));

  return parts.join("\n");
}

export const CREATE_RADAR_CHART_TOOL = {
  name: "create_radar_chart",
  description:
    "Create a maturity/gap assessment chart showing current scores vs targets across multiple dimensions. Returns a markdown table with visual bars plus a Mermaid bar chart. Use for NIS2/ISO 27001 maturity, risk domain scoring, ASVS coverage.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      scale_max: { type: "number", description: "Maximum score (default: 5)" },
      dimensions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Assessment dimension (e.g., 'Access Control')" },
            current: { type: "number", description: "Current maturity score" },
            target: { type: "number", description: "Target maturity score" },
          },
          required: ["name", "current"],
        },
      },
    },
    required: ["title", "dimensions"],
  },
};
