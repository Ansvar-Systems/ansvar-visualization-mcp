/**
 * create_state_diagram — State machine diagram.
 *
 * Compliance lifecycle (draft → review → approved → expired),
 * asset states, incident response stages, document workflows.
 */
import { sanitizeLabel, sanitizeId, mermaidBlock } from "../sanitize.js";
import { assertNonEmptyArray, assertReferencesExist, assertUniqueIds } from "./validation.js";

export interface StateNode {
  id: string;
  label: string;
  type?: "normal" | "start" | "end" | "choice" | "fork" | "join";
  description?: string;
}

export interface StateTransition {
  from: string;
  to: string;
  label?: string;
  guard?: string;
}

export interface StateDiagramInput {
  title?: string;
  states: StateNode[];
  transitions: StateTransition[];
}

export function createStateDiagram(input: StateDiagramInput): string {
  assertNonEmptyArray("states", input.states);
  assertUniqueIds("states", input.states.map((state) => state.id));

  const stateIds = new Set(input.states.map((state) => state.id));
  assertReferencesExist(
    "State transition",
    input.transitions
      .flatMap((transition) => [transition.from, transition.to])
      .filter((id) => id !== "[*]"),
    stateIds,
    "state"
  );

  const lines: string[] = ["stateDiagram-v2"];

  // Auto-add [*] transitions for start/end typed states
  const startStates = input.states.filter((s) => s.type === "start");
  const endStates = input.states.filter((s) => s.type === "end");
  for (const s of startStates) {
    // Add [*] → state transition if not already present
    const hasTransition = input.transitions.some((t) => t.from === "[*]" && t.to === s.id);
    if (!hasTransition) {
      input.transitions = [{ from: "[*]", to: s.id }, ...input.transitions];
    }
  }
  for (const s of endStates) {
    const hasTransition = input.transitions.some((t) => t.to === "[*]" && t.from === s.id);
    if (!hasTransition) {
      input.transitions = [...input.transitions, { from: s.id, to: "[*]" }];
    }
  }

  // Render states (skip start/end — Mermaid uses [*] pseudo-state)
  for (const state of input.states) {
    if (state.type === "start" || state.type === "end") continue;

    const id = sanitizeId(state.id);
    const label = sanitizeLabel(state.label);

    if (state.type === "choice") {
      lines.push(`  state ${id} <<choice>>`);
    } else if (state.type === "fork") {
      lines.push(`  state ${id} <<fork>>`);
    } else if (state.type === "join") {
      lines.push(`  state ${id} <<join>>`);
    } else {
      lines.push(`  ${id} : ${label}`);
    }

    if (state.description) {
      lines.push(`  note right of ${id} : ${sanitizeLabel(state.description)}`);
    }
  }

  // Render transitions
  for (const t of input.transitions) {
    const from = t.from === "[*]" ? "[*]" : sanitizeId(t.from);
    const to = t.to === "[*]" ? "[*]" : sanitizeId(t.to);

    if (t.label || t.guard) {
      const label = t.guard
        ? `${sanitizeLabel(t.label ?? "")} [${sanitizeLabel(t.guard)}]`
        : sanitizeLabel(t.label ?? "");
      lines.push(`  ${from} --> ${to} : ${label.trim()}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
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

export const CREATE_STATE_DIAGRAM_TOOL = {
  name: "create_state_diagram",
  description:
    "Create a state machine diagram for lifecycle management — compliance status, document workflow, asset states, incident stages. Supports choice/fork/join nodes and guarded transitions. Returns a Mermaid stateDiagram-v2.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      states: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Use [*] for start/end pseudo-states" },
            label: { type: "string" },
            type: { type: "string", enum: ["normal", "start", "end", "choice", "fork", "join"] },
            description: { type: "string" },
          },
          required: ["id", "label"],
        },
      },
      transitions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            label: { type: "string", description: "Transition trigger/action" },
            guard: { type: "string", description: "Condition for the transition" },
          },
          required: ["from", "to"],
        },
      },
    },
    required: ["states", "transitions"],
  },
};
