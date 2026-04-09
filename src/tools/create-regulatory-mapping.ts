/**
 * create_regulatory_mapping — Regulation → Controls → Gaps visual mapping.
 *
 * Domain-specific to Ansvar: understands column semantics for regulation
 * articles, control frameworks, evidence, and gap status. Produces both
 * a structured table and a Mermaid flowchart showing the mapping graph.
 */
import { escapeCell, sanitizeId, sanitizeLabel, mermaidBlock } from "../sanitize.js";
import { assertNonEmptyArray, assertReferencesExist, assertUniqueIds } from "./validation.js";

export interface RegArticle {
  id: string;
  title: string;
}

export interface RegControl {
  id: string;
  title: string;
  framework: string;
}

export interface RegMapping {
  article: string;
  control: string;
  gap_status: "covered" | "partial" | "gap";
  notes?: string;
}

export interface RegulatoryMappingInput {
  title?: string;
  regulation: string;
  articles: RegArticle[];
  controls: RegControl[];
  mappings: RegMapping[];
}

const GAP_INDICATORS: Record<string, string> = {
  covered: "\u2705",
  partial: "\u{1F7E1}",
  gap: "\u274C",
};

export function createRegulatoryMapping(input: RegulatoryMappingInput): string {
  assertNonEmptyArray("articles", input.articles);
  assertNonEmptyArray("controls", input.controls);
  assertNonEmptyArray("mappings", input.mappings);
  assertUniqueIds("articles", input.articles.map((article) => article.id));
  assertUniqueIds("controls", input.controls.map((control) => control.id));

  const articleIds = new Set(input.articles.map((article) => article.id));
  const controlIds = new Set(input.controls.map((control) => control.id));
  assertReferencesExist(
    "Regulatory mapping article",
    input.mappings.map((mapping) => mapping.article),
    articleIds,
    "article"
  );
  assertReferencesExist(
    "Regulatory mapping control",
    input.mappings.map((mapping) => mapping.control),
    controlIds,
    "control"
  );

  const parts: string[] = [];
  if (input.title) {
    parts.push(`### ${input.title}\n`);
  }

  // Summary stats
  const covered = input.mappings.filter((m) => m.gap_status === "covered").length;
  const partial = input.mappings.filter((m) => m.gap_status === "partial").length;
  const gaps = input.mappings.filter((m) => m.gap_status === "gap").length;
  const total = input.mappings.length;

  parts.push(
    `**${input.regulation} Mapping Summary:** ${covered} covered | ${partial} partial | ${gaps} gaps — ${total} total mappings\n`
  );

  // Mapping table
  parts.push("| Article | Control | Framework | Status | Notes |");
  parts.push("| --- | --- | --- | :---: | --- |");

  // Group by article for readability
  const byArticle = new Map<string, RegMapping[]>();
  for (const m of input.mappings) {
    const list = byArticle.get(m.article) ?? [];
    list.push(m);
    byArticle.set(m.article, list);
  }

  const articleLookup = new Map(input.articles.map((a) => [a.id, a]));
  const controlLookup = new Map(input.controls.map((c) => [c.id, c]));

  for (const article of input.articles) {
    const articleMappings = byArticle.get(article.id) ?? [];
    if (articleMappings.length === 0) {
      parts.push(
        `| **${escapeCell(article.id)}** ${escapeCell(article.title)} | — | — | \u274C | No control mapped |`
      );
      continue;
    }

    for (let i = 0; i < articleMappings.length; i++) {
      const m = articleMappings[i];
      const ctrl = controlLookup.get(m.control);
      const indicator = GAP_INDICATORS[m.gap_status] ?? "";
      const articleCell =
        i === 0
          ? `**${escapeCell(article.id)}** ${escapeCell(article.title)}`
          : "";

      parts.push(
        `| ${articleCell} | ${escapeCell(ctrl?.id ?? m.control)} ${escapeCell(ctrl?.title ?? "")} | ${escapeCell(ctrl?.framework ?? "")} | ${indicator} | ${escapeCell(m.notes ?? "")} |`
      );
    }
  }

  // Mermaid mapping graph
  const graphLines: string[] = ["flowchart LR"];

  // Regulation articles on the left
  graphLines.push(`  subgraph reg["${sanitizeLabel(input.regulation)}"]`);
  for (const a of input.articles) {
    graphLines.push(`    ${sanitizeId(a.id)}["${sanitizeLabel(a.id)} ${sanitizeLabel(a.title)}"]`);
  }
  graphLines.push("  end");

  // Controls on the right, grouped by framework
  const frameworks = new Map<string, RegControl[]>();
  for (const c of input.controls) {
    const list = frameworks.get(c.framework) ?? [];
    list.push(c);
    frameworks.set(c.framework, list);
  }

  for (const [fw, controls] of frameworks) {
    graphLines.push(`  subgraph ${sanitizeId(fw)}["${sanitizeLabel(fw)}"]`);
    for (const c of controls) {
      graphLines.push(`    ${sanitizeId(c.id)}["${sanitizeLabel(c.id)}"]`);
    }
    graphLines.push("  end");
  }

  // Edges with gap status
  for (const m of input.mappings) {
    const from = sanitizeId(m.article);
    const to = sanitizeId(m.control);
    if (m.gap_status === "covered") {
      graphLines.push(`  ${from} --> ${to}`);
    } else if (m.gap_status === "partial") {
      graphLines.push(`  ${from} -.-> ${to}`);
    } else {
      graphLines.push(`  ${from} -.-x ${to}`);
    }
  }

  parts.push("\n" + mermaidBlock(graphLines.join("\n")));

  return parts.join("\n");
}

export const CREATE_REGULATORY_MAPPING_TOOL = {
  name: "create_regulatory_mapping",
  description:
    "Create a regulation-to-controls mapping with gap analysis. Produces a structured table plus a Mermaid graph showing article-to-control relationships with coverage status. Domain-specific to compliance workflows.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      regulation: { type: "string", description: "Regulation name (e.g., NIS2, DORA)" },
      articles: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" }, title: { type: "string" } },
          required: ["id", "title"],
        },
      },
      controls: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            framework: { type: "string", description: "Control framework (e.g., ISO 27001)" },
          },
          required: ["id", "title", "framework"],
        },
      },
      mappings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            article: { type: "string" },
            control: { type: "string" },
            gap_status: { type: "string", enum: ["covered", "partial", "gap"] },
            notes: { type: "string" },
          },
          required: ["article", "control", "gap_status"],
        },
      },
    },
    required: ["regulation", "articles", "controls", "mappings"],
  },
};
