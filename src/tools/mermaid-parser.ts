let mermaidPromise: Promise<typeof import("mermaid").default> | undefined;

function setGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

async function ensureDomEnvironment(): Promise<void> {
  if (typeof document !== "undefined" && typeof window !== "undefined") {
    return;
  }

  const { JSDOM } = await import("jsdom");
  const { window: domWindow } = new JSDOM("<!doctype html><html><body></body></html>");
  setGlobal("window", domWindow);
  setGlobal("document", domWindow.document);
  setGlobal("navigator", domWindow.navigator);
  setGlobal("location", domWindow.location);
  setGlobal("Element", domWindow.Element);
  setGlobal("HTMLElement", domWindow.HTMLElement);
  setGlobal("SVGElement", domWindow.SVGElement);
  setGlobal("Node", domWindow.Node);
  setGlobal("DOMParser", domWindow.DOMParser);
  setGlobal("XMLSerializer", domWindow.XMLSerializer);
}

export async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = (async () => {
      await ensureDomEnvironment();
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
      return mermaid;
    })();
  }
  return mermaidPromise;
}

export async function parseMermaid(code: string) {
  const mermaid = await getMermaid();
  return mermaid.parse(code);
}

export function extractMermaidBlocks(text: string): string[] {
  const matches = text.matchAll(/```mermaid\s*\n([\s\S]*?)\n```/g);
  return [...matches].map((match) => match[1].trim());
}

export async function validateMermaidOutput(text: string): Promise<string[]> {
  const blocks = extractMermaidBlocks(text);
  const diagramTypes: string[] = [];

  for (const block of blocks) {
    const result = await parseMermaid(block);
    diagramTypes.push(result.diagramType);
  }

  return diagramTypes;
}
