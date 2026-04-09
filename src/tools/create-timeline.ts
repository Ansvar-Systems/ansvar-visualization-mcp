/**
 * create_timeline — Gantt-style timeline diagram.
 *
 * Implementation roadmaps, compliance deadlines, incident timelines,
 * audit schedules, regulation transition periods.
 */
import { sanitizeLabel, mermaidBlock } from "../sanitize.js";
import { assertNonEmptyArray } from "./validation.js";

export interface TimelineTask {
  name: string;
  start: string;
  end: string;
  status?: "done" | "active" | "crit" | "milestone";
}

export interface TimelineSection {
  name: string;
  tasks: TimelineTask[];
}

export interface TimelineInput {
  title: string;
  date_format?: string;
  sections: TimelineSection[];
}

export function createTimeline(input: TimelineInput): string {
  assertNonEmptyArray("sections", input.sections);
  for (const section of input.sections) {
    assertNonEmptyArray(`section ${section.name} tasks`, section.tasks);
  }

  const lines: string[] = ["gantt"];
  lines.push(`  title ${sanitizeLabel(input.title)}`);
  lines.push(`  dateFormat ${input.date_format ?? "YYYY-MM-DD"}`);

  for (const section of input.sections) {
    lines.push(`  section ${sanitizeLabel(section.name)}`);
    for (const task of section.tasks) {
      const prefix = task.status ? `${task.status}, ` : "";
      lines.push(`    ${sanitizeLabel(task.name)} : ${prefix}${task.start}, ${task.end}`);
    }
  }

  const diagram = mermaidBlock(lines.join("\n"));
  return diagram;
}

export const CREATE_TIMELINE_TOOL = {
  name: "create_timeline",
  description:
    "Create a Gantt-style timeline with sections and tasks. Use for implementation roadmaps, compliance deadlines, incident timelines, audit schedules. Returns a Mermaid gantt.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      date_format: { type: "string", description: "Date format (default: YYYY-MM-DD)" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  start: { type: "string" },
                  end: { type: "string" },
                  status: { type: "string", enum: ["done", "active", "crit", "milestone"] },
                },
                required: ["name", "start", "end"],
              },
            },
          },
          required: ["name", "tasks"],
        },
      },
    },
    required: ["title", "sections"],
  },
};
