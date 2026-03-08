/**
 * create_swimlane — Multi-party responsibility diagram.
 *
 * Each lane represents a responsible party (team, org, system).
 * Steps flow through lanes showing handoffs and parallel work.
 * Maps to TPRM workflows, DORA responsibility chains, incident response.
 */
import { sanitizeLabel, sanitizeId, mermaidBlock } from "../sanitize.js";

export interface SwimLane {
  id: string;
  label: string;
}

export interface SwimStep {
  id: string;
  label: string;
  lane: string;
  type?: "action" | "decision" | "start" | "end";
  next?: string[];
}

export interface SwimlaneInput {
  title?: string;
  lanes: SwimLane[];
  steps: SwimStep[];
}

const STEP_SHAPES: Record<string, [string, string]> = {
  action: ["[", "]"],
  decision: ["{", "}"],
  start: ["([", "])"],   // stadium shape (rounded)
  end: ["[[", "]]"],     // subroutine shape (double border) — visually distinct from start
};

export function createSwimlane(input: SwimlaneInput): string {
  const lines: string[] = ["flowchart LR"];

  // Group steps by lane
  const laneSteps = new Map<string, SwimStep[]>();
  for (const step of input.steps) {
    const list = laneSteps.get(step.lane) ?? [];
    list.push(step);
    laneSteps.set(step.lane, list);
  }

  // Render lanes as subgraphs
  for (const lane of input.lanes) {
    const laneId = sanitizeId(lane.id);
    const laneLabel = sanitizeLabel(lane.label);
    lines.push(`  subgraph ${laneId}["${laneLabel}"]`);

    const steps = laneSteps.get(lane.id) ?? [];
    for (const step of steps) {
      const [left, right] = STEP_SHAPES[step.type ?? "action"] ?? STEP_SHAPES.action;
      lines.push(`    ${sanitizeId(step.id)}${left}${sanitizeLabel(step.label)}${right}`);
    }

    lines.push("  end");
  }

  // Render connections
  for (const step of input.steps) {
    for (const nextId of step.next ?? []) {
      const fromId = sanitizeId(step.id);
      const toId = sanitizeId(nextId);
      // Cross-lane connections get thick arrows
      const fromLane = step.lane;
      const toLane = input.steps.find((s) => s.id === nextId)?.lane;
      const arrow = fromLane !== toLane ? "==>" : "-->";
      lines.push(`  ${fromId} ${arrow} ${toId}`);
    }
  }

  const diagram = mermaidBlock(lines.join("\n"));
  const parts: string[] = [];
  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }
  parts.push(diagram);
  return parts.join("\n");
}

export const CREATE_SWIMLANE_TOOL = {
  name: "create_swimlane",
  description:
    "Create a swimlane diagram showing multi-party responsibilities. Each lane is a responsible party; steps flow within and across lanes with handoff arrows. Returns validated Mermaid flowchart.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      lanes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
          },
          required: ["id", "label"],
        },
        description: "Responsible parties (teams, orgs, systems)",
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            lane: { type: "string", description: "Lane ID this step belongs to" },
            type: { type: "string", enum: ["action", "decision", "start", "end"] },
            next: { type: "array", items: { type: "string" }, description: "IDs of next steps" },
          },
          required: ["id", "label", "lane"],
        },
      },
    },
    required: ["lanes", "steps"],
  },
};
