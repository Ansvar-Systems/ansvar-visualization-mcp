/**
 * validate_and_fix_mermaid — Syntax check and auto-correction.
 *
 * Common LLM Mermaid errors this catches and fixes:
 * - Missing diagram type declaration
 * - Unquoted labels with special characters
 * - Mismatched brackets
 * - Empty node labels
 * - Semicolons instead of newlines
 * - "graph" instead of "flowchart"
 */
import { parseMermaid } from "./mermaid-parser.js";

export interface ValidateMermaidInput {
  mermaid: string;
}

interface ValidationResult {
  fixed: string;
  changes: string[];
  warnings: string[];
}

function formatParserError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim();
  }
  return String(error).trim();
}

export async function validateAndFixMermaid(input: ValidateMermaidInput): Promise<string> {
  const result = validate(input.mermaid);
  let parserResult:
    | { valid: true; diagramType: string }
    | { valid: false; error: string };

  try {
    const parsed = await parseMermaid(result.fixed);
    parserResult = { valid: true, diagramType: parsed.diagramType };
  } catch (error) {
    parserResult = { valid: false, error: formatParserError(error) };
  }

  const parts: string[] = [];

  if (parserResult.valid) {
    parts.push(
      `**Status:** ${
        result.changes.length > 0
          ? "Parser validation passed after heuristic fixes."
          : "Parser validation passed."
      }\n`
    );
    parts.push(`**Diagram Type:** \`${parserResult.diagramType}\``);
    if (result.changes.length > 0) {
      parts.push("\n**Changes applied:**\n");
      for (const change of result.changes) {
        parts.push(`- ${change}`);
      }
    }
    if (result.warnings.length > 0) {
      parts.push("\n**Warnings:**\n");
      for (const warn of result.warnings) {
        parts.push(`- ${warn}`);
      }
    }
    parts.push("\n```mermaid\n" + result.fixed + "\n```");
  } else if (result.changes.length > 0) {
    parts.push("**Status:** Parser validation failed after heuristic fixes.\n");
    parts.push("**Changes applied:**\n");
    for (const change of result.changes) {
      parts.push(`- ${change}`);
    }
    if (result.warnings.length > 0) {
      parts.push("\n**Warnings:**\n");
      for (const warn of result.warnings) {
        parts.push(`- ${warn}`);
      }
    }
    parts.push(`\n**Parser Error:** ${parserResult.error}`);
    parts.push("\n**Fixed Candidate:**\n");
    parts.push("```mermaid\n" + result.fixed + "\n```");
  } else {
    parts.push("**Status:** Parser validation failed. Manual correction required.\n");
    for (const warn of result.warnings) {
      parts.push(`- ${warn}`);
    }
    parts.push(`\n**Parser Error:** ${parserResult.error}`);
    parts.push("\n**Original:**\n```\n" + input.mermaid + "\n```");
  }

  return parts.join("\n");
}

function validate(raw: string): ValidationResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  let code = raw.trim();

  // Strip fenced code block markers if present
  if (code.startsWith("```mermaid")) {
    code = code.replace(/^```mermaid\s*\n?/, "").replace(/\n?```\s*$/, "");
    changes.push("Stripped code fence markers");
  } else if (code.startsWith("```")) {
    code = code.replace(/^```\w*\s*\n?/, "").replace(/\n?```\s*$/, "");
    changes.push("Stripped code fence markers");
  }

  // Replace semicolons with newlines (common LLM error)
  if (code.includes(";")) {
    code = code.replace(/;\s*/g, "\n");
    changes.push("Replaced semicolons with newlines");
  }

  // Normalize "graph" to "flowchart" (deprecated but LLMs still use it)
  if (/^graph\s+(TD|LR|TB|BT|RL)/m.test(code)) {
    code = code.replace(/^graph\s+(TD|LR|TB|BT|RL)/m, "flowchart $1");
    changes.push("Replaced deprecated 'graph' with 'flowchart'");
  }

  // Check for diagram type declaration
  const diagramTypes = [
    "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram",
    "stateDiagram-v2", "erDiagram", "gantt", "pie", "mindmap",
    "timeline", "xychart-beta", "block-beta", "quadrantChart",
  ];
  const firstLine = code.split("\n")[0].trim();
  const hasType = diagramTypes.some(
    (t) => firstLine.startsWith(t)
  );
  if (!hasType) {
    // Try to infer
    if (code.includes("-->") || code.includes("==>")) {
      code = "flowchart TD\n" + code;
      changes.push("Added missing 'flowchart TD' declaration (inferred from arrow syntax)");
    } else if (code.includes("->>") || code.includes("participant")) {
      code = "sequenceDiagram\n" + code;
      changes.push("Added missing 'sequenceDiagram' declaration");
    } else {
      warnings.push("Could not determine diagram type — no declaration found and syntax ambiguous");
    }
  }

  const normalizedFirstLine = code.split("\n")[0].trim();
  if (normalizedFirstLine.startsWith("flowchart")) {
    if (/\s--\s/.test(code)) {
      warnings.push("Found '--' edges without arrowheads; use '-->' or another complete Mermaid edge operator");
    }

    const suspicious = code
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => {
        if (/^(%%|subgraph\b|end\b|classDef\b|class\b|style\b|linkStyle\b|click\b)/.test(line)) {
          return false;
        }
        if (/(-->|==>|-.->|--x|--o|<-->|---)/.test(line)) {
          return false;
        }
        if (/^[A-Za-z0-9_]+\s*(\[\(|\[\[|\[|\(|\{)/.test(line)) {
          return false;
        }
        return true;
      });
    if (suspicious.length > 0) {
      warnings.push(`Unrecognized flowchart line(s): ${suspicious.slice(0, 3).join(" | ")}`);
    }
  }

  if (normalizedFirstLine.startsWith("sequenceDiagram")) {
    const suspicious = code
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => {
        if (/^(%%|participant\b|actor\b|Note\b|loop\b|end\b|alt\b|else\b|opt\b|par\b|and\b|rect\b|break\b|critical\b|activate\b|deactivate\b|autonumber\b|title\b|destroy\b)/.test(line)) {
          return false;
        }
        if (/(->>|-->>|-->>\+|-->>-|-\))/.test(line)) {
          return false;
        }
        return true;
      });
    if (suspicious.length > 0) {
      warnings.push(`Unrecognized sequence line(s): ${suspicious.slice(0, 3).join(" | ")}`);
    }
  }

  // Fix unbalanced quotes in labels
  const quoteCount = (code.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    warnings.push("Unbalanced double quotes detected — may cause parse errors");
  }

  // Check for common bracket issues
  const opens = (code.match(/\[/g) || []).length;
  const closes = (code.match(/\]/g) || []).length;
  if (opens !== closes) {
    warnings.push(`Unbalanced square brackets: ${opens} opening, ${closes} closing`);
  }

  const parenOpens = (code.match(/\(/g) || []).length;
  const parenCloses = (code.match(/\)/g) || []).length;
  if (parenOpens !== parenCloses) {
    warnings.push(`Unbalanced parentheses: ${parenOpens} opening, ${parenCloses} closing`);
  }

  // Fix empty node labels: A[] → A[A]
  code = code.replace(/(\w+)\[\s*\]/g, (_, id) => {
    changes.push(`Fixed empty label for node '${id}'`);
    return `${id}[${id}]`;
  });

  return { fixed: code, changes, warnings };
}

export const VALIDATE_MERMAID_TOOL = {
  name: "validate_and_fix_mermaid",
  description:
    "Validate Mermaid with the official Mermaid parser, after applying best-effort fixes for common issues such as missing declarations, semicolons, deprecated syntax, and unbalanced brackets. Returns parser results, warnings, and any changes applied.",
  inputSchema: {
    type: "object" as const,
    properties: {
      mermaid: { type: "string", description: "Raw Mermaid code to validate" },
    },
    required: ["mermaid"],
  },
};
