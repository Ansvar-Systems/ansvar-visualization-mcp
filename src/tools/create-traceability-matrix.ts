/**
 * create_traceability_matrix — Requirements → Controls → Evidence mapping.
 *
 * Core compliance output. Maps regulation articles to controls to evidence,
 * with gap status indicators. The 2D mapping is something LLMs consistently
 * mangle — this tool guarantees correct structure.
 */
import { escapeCell } from "../sanitize.js";

export interface TraceItem {
  id: string;
  label: string;
}

export interface TraceMapping {
  requirement: string;
  control: string;
  evidence?: string;
  status: "met" | "partial" | "gap" | "not-applicable";
}

export interface TraceabilityInput {
  title?: string;
  requirements: TraceItem[];
  controls: TraceItem[];
  mappings: TraceMapping[];
}

const STATUS_INDICATORS: Record<string, string> = {
  met: "\u2705",           // green check
  covered: "\u2705",      // alias — LLMs frequently use "covered" instead of "met"
  partial: "\u{1F7E1}",   // yellow circle
  gap: "\u274C",           // red X
  "not-applicable": "\u2796", // heavy minus
};

export function createTraceabilityMatrix(input: TraceabilityInput): string {
  const parts: string[] = [];
  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }

  // Build mapping lookup: requirement → control → mapping
  const mappingLookup = new Map<string, Map<string, TraceMapping>>();
  for (const m of input.mappings) {
    if (!mappingLookup.has(m.requirement)) {
      mappingLookup.set(m.requirement, new Map());
    }
    mappingLookup.get(m.requirement)!.set(m.control, m);
  }

  // Header row: Requirement | Control 1 | Control 2 | ...
  const controlHeaders = input.controls.map((c) => `**${escapeCell(c.id)}**`);
  parts.push("| **Requirement** | " + controlHeaders.join(" | ") + " |");
  parts.push("| --- | " + input.controls.map(() => ":---:").join(" | ") + " |");

  // Data rows
  for (const req of input.requirements) {
    const cells: string[] = [`**${escapeCell(req.id)}** ${escapeCell(req.label)}`];

    for (const ctrl of input.controls) {
      const mapping = mappingLookup.get(req.id)?.get(ctrl.id);
      if (mapping) {
        const indicator = STATUS_INDICATORS[mapping.status] ?? "";
        cells.push(indicator);
      } else {
        cells.push("");
      }
    }

    parts.push("| " + cells.join(" | ") + " |");
  }

  // Control legend
  parts.push("\n**Controls:**\n");
  for (const ctrl of input.controls) {
    parts.push(`- **${ctrl.id}**: ${ctrl.label}`);
  }

  // Coverage summary
  const total = input.mappings.length;
  const met = input.mappings.filter((m) => m.status === "met").length;
  const partial = input.mappings.filter((m) => m.status === "partial").length;
  const gaps = input.mappings.filter((m) => m.status === "gap").length;
  const na = input.mappings.filter((m) => m.status === "not-applicable").length;

  parts.push(
    `\n**Coverage:** ${met} met | ${partial} partial | ${gaps} gaps | ${na} N/A — out of ${total} mappings`
  );

  // Evidence listing if any mappings have evidence
  const withEvidence = input.mappings.filter((m) => m.evidence);
  if (withEvidence.length > 0) {
    parts.push("\n**Evidence:**\n");
    parts.push("| Requirement | Control | Evidence | Status |");
    parts.push("| --- | --- | --- | --- |");
    for (const m of withEvidence) {
      const indicator = STATUS_INDICATORS[m.status] ?? "";
      parts.push(
        `| ${escapeCell(m.requirement)} | ${escapeCell(m.control)} | ${escapeCell(m.evidence ?? "")} | ${indicator} |`
      );
    }
  }

  return parts.join("\n");
}

export const CREATE_TRACEABILITY_MATRIX_TOOL = {
  name: "create_traceability_matrix",
  description:
    "Create a requirements-to-controls traceability matrix with gap status indicators, evidence tracking, and coverage summary. Core compliance output for regulation → control → evidence mapping.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      requirements: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" }, label: { type: "string" } },
          required: ["id", "label"],
        },
        description: "Regulation articles or requirements",
      },
      controls: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" }, label: { type: "string" } },
          required: ["id", "label"],
        },
        description: "Security controls or framework clauses",
      },
      mappings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            requirement: { type: "string" },
            control: { type: "string" },
            evidence: { type: "string" },
            status: { type: "string", enum: ["met", "covered", "partial", "gap", "not-applicable"] },
          },
          required: ["requirement", "control", "status"],
        },
      },
    },
    required: ["requirements", "controls", "mappings"],
  },
};
