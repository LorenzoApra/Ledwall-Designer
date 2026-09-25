import { describe, expect, it } from "vitest";
import { DEFAULT_LIBRARIES } from "./data/defaultLibraries";
import { createDefaultProject } from "./data/defaultProject";
import { createTechnicalPdf, createWiringPdf } from "./export/reports";
import { translateText } from "./i18n";

describe("Italian and English output", () => {
  it("translates fixed and variable interface text without altering project names", () => {
    expect(translateText("Aggiorna dalla rete", "en")).toBe("Update from network");
    expect(translateText("Linea 3: 8 cabinet - 1.5 kW massimo - 0.8 kW medio", "en"))
      .toBe("Line 3: 8 cabinets - 1.5 kW maximum - 0.8 kW average");
    expect(translateText("12 cabinet eliminati · usa Annulla per ripristinarli", "en"))
      .toBe("12 cabinets deleted · use Undo to restore them");
    expect(translateText("Pixel attivi in pixelmap:", "en"))
      .toBe("Active pixels in pixelmap:");
    expect(translateText("Progetto concerto", "en")).toBe("Progetto concerto");
    expect(translateText("Aggiorna dalla rete", "it")).toBe("Aggiorna dalla rete");
  });

  it("generates both English PDF types", () => {
    const project = createDefaultProject();
    const technical = createTechnicalPdf(project, DEFAULT_LIBRARIES, "en");
    const wiring = createWiringPdf(project, DEFAULT_LIBRARIES, "en");
    expect(new TextDecoder().decode(technical.slice(0, 8))).toContain("%PDF");
    expect(new TextDecoder().decode(wiring.slice(0, 8))).toContain("%PDF");
    expect(new TextDecoder().decode(technical)).toContain("TECHNICAL REPORT");
    expect(new TextDecoder().decode(technical)).toContain("Active pixels in pixelmap:");
    expect(new TextDecoder().decode(technical)).not.toContain("Pixel attivi in pixelmap:");
    expect(new TextDecoder().decode(wiring)).toContain("DATA WIRING");
    expect(technical.length).toBeGreaterThan(1000);
    expect(wiring.length).toBeGreaterThan(1000);
  });
});
