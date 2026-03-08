/**
 * create_sequence — Sequence diagram for multi-party interactions.
 *
 * Maps to compliance reporting flows, incident notification timelines,
 * API call sequences, and authentication flows.
 */
import { sanitizeLabel, mermaidBlock } from "../sanitize.js";

export interface SeqParticipant {
  id: string;
  label: string;
  type?: "actor" | "participant" | "database" | "queue";
}

export interface SeqMessage {
  from: string;
  to: string;
  label: string;
  type?: "sync" | "async" | "reply" | "create" | "destroy";
}

export interface SeqNote {
  over: string | string[];
  text: string;
  position?: "left" | "right" | "over";
}

export interface SeqLoop {
  label: string;
  start_index: number;
  end_index: number;
}

export interface SequenceInput {
  title?: string;
  participants: SeqParticipant[];
  messages: SeqMessage[];
  notes?: SeqNote[];
  loops?: SeqLoop[];
  autonumber?: boolean;
}

const PARTICIPANT_KEYWORDS: Record<string, string> = {
  actor: "actor",
  participant: "participant",
  database: "participant",
  queue: "participant",
};

const ARROW_TYPES: Record<string, string> = {
  sync: "->>",
  async: "-)",
  reply: "-->>",
  create: "-->>+",
  destroy: "-->>-",
};

export function createSequence(input: SequenceInput): string {
  const lines: string[] = ["sequenceDiagram"];

  if (input.autonumber) {
    lines.push("  autonumber");
  }

  // Participants
  for (const p of input.participants) {
    const keyword = PARTICIPANT_KEYWORDS[p.type ?? "participant"] ?? "participant";
    lines.push(`  ${keyword} ${p.id} as ${sanitizeLabel(p.label)}`);
  }

  // Build message list with interleaved notes and loops
  const loopStarts = new Map<number, string>();
  const loopEnds = new Set<number>();
  for (const loop of input.loops ?? []) {
    loopStarts.set(loop.start_index, loop.label);
    loopEnds.add(loop.end_index);
  }

  // Notes keyed by "after message index"
  const notesByIndex = new Map<number, SeqNote[]>();
  for (const note of input.notes ?? []) {
    // Notes without explicit index go at the end
    // For now, notes are appended after all messages
  }

  for (let i = 0; i < input.messages.length; i++) {
    const loopLabel = loopStarts.get(i);
    if (loopLabel) {
      lines.push(`  loop ${sanitizeLabel(loopLabel)}`);
    }

    const msg = input.messages[i];
    const arrow = ARROW_TYPES[msg.type ?? "sync"] ?? "->>";
    lines.push(`  ${msg.from}${arrow}${msg.to}: ${sanitizeLabel(msg.label)}`);

    if (loopEnds.has(i)) {
      lines.push("  end");
    }
  }

  // Append notes at the end
  for (const note of input.notes ?? []) {
    const targets = Array.isArray(note.over) ? note.over.join(",") : note.over;
    const pos = note.position ?? "over";
    if (pos === "over") {
      lines.push(`  Note over ${targets}: ${sanitizeLabel(note.text)}`);
    } else if (pos === "left") {
      lines.push(`  Note left of ${targets}: ${sanitizeLabel(note.text)}`);
    } else {
      lines.push(`  Note right of ${targets}: ${sanitizeLabel(note.text)}`);
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

export const CREATE_SEQUENCE_TOOL = {
  name: "create_sequence",
  description:
    "Create a sequence diagram showing interactions between participants with typed messages (sync, async, reply), loops, and notes. Returns validated Mermaid sequenceDiagram.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      autonumber: { type: "boolean", description: "Show message sequence numbers" },
      participants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            type: { type: "string", enum: ["actor", "participant", "database", "queue"] },
          },
          required: ["id", "label"],
        },
      },
      messages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            label: { type: "string" },
            type: { type: "string", enum: ["sync", "async", "reply", "create", "destroy"] },
          },
          required: ["from", "to", "label"],
        },
      },
      notes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            over: { description: "Participant ID(s)" },
            text: { type: "string" },
            position: { type: "string", enum: ["left", "right", "over"] },
          },
          required: ["over", "text"],
        },
      },
      loops: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            start_index: { type: "number" },
            end_index: { type: "number" },
          },
          required: ["label", "start_index", "end_index"],
        },
      },
    },
    required: ["participants", "messages"],
  },
};
