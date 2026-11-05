import { describe, expect, it } from "vitest";
import { DEFAULT_LIBRARIES } from "../data/defaultLibraries";
import { createDefaultProject } from "../data/defaultProject";
import { orderCabinetsByPattern } from "./cablingPatterns";
import { createAutomaticPowerLines } from "./electrical";
import { arrangeScreens, createCabinetGrid, findAvailableScreenPosition } from "./layout";
import type { CablingPattern, LedScreen } from "./types";
import { createAutoWiring, mergeAutomaticPortRuns } from "./wiring";

const expected: Record<CablingPattern, string[]> = {
  "rows-tl": ["1,1", "1,2", "1,3", "2,3", "2,2", "2,1"],
  "columns-tl": ["1,1", "2,1", "2,2", "1,2", "1,3", "2,3"],
  "rows-tr": ["1,3", "1,2", "1,1", "2,1", "2,2", "2,3"],
  "columns-tr": ["1,3", "2,3", "2,2", "1,2", "1,1", "2,1"],
  "rows-bl": ["2,1", "2,2", "2,3", "1,3", "1,2", "1,1"],
  "columns-bl": ["2,1", "1,1", "1,2", "2,2", "2,3", "1,3"],
  "rows-br": ["2,3", "2,2", "2,1", "1,1", "1,2", "1,3"],
  "columns-br": ["2,3", "1,3", "1,2", "2,2", "2,1", "1,1"],
};

describe("user-selected cabling and independent screens", () => {
  for (const [pattern, coordinates] of Object.entries(expected)) {
    it(`keeps ${pattern} ordering across capacity splits for data and power`, () => {
      const project = createDefaultProject();
      const screen = project.screens[0];
      screen.dataPattern = pattern as CablingPattern;
      screen.powerPattern = pattern as CablingPattern;
      const cabinets = createCabinetGrid(screen, DEFAULT_LIBRARIES.cabinets[0], { rows: 2, columns: 3, rotation: 0 });
      const lookup = new Map(cabinets.map((cabinet) => [cabinet.id, `${cabinet.row},${cabinet.column}`]));
      expect(orderCabinetsByPattern(cabinets, pattern as CablingPattern).map((cabinet) => lookup.get(cabinet.id))).toEqual(coordinates);
      const libraries = structuredClone(DEFAULT_LIBRARIES);
      const controller = project.controllers[0];
      controller.modelId = "novastar-mx30";
      controller.mode.redundancy = false;
      libraries.controllers.find((model) => model.id === controller.modelId)!.bandwidthPixelsPerSecond8Bit = 3 * 128 * 128 * 50;
      const data = createAutoWiring(screen, cabinets, controller, libraries);
      expect(data.runs).toHaveLength(2);
      expect(data.runs.flatMap((run) => run.cabinetIds.map((id) => lookup.get(id)))).toEqual(coordinates);
      const power = createAutomaticPowerLines(cabinets, libraries,
        { voltageV: 230, breakerA: 2, utilizationPercent: 100 }, [screen]);
      expect(power).toHaveLength(3);
      expect(power.flatMap((line) => line.cabinetIds.map((id) => lookup.get(id)))).toEqual(coordinates);
    });
  }

  it("skips excluded cabinets and never joins different screens on one power line", () => {
    const project = createDefaultProject();
    const first = project.screens[0];
    const second: LedScreen = { ...first, id: "second", powerPattern: "columns-br" };
    const cabinets = [first, second].flatMap((screen) => createCabinetGrid(screen, DEFAULT_LIBRARIES.cabinets[0], { rows: 2, columns: 3, rotation: 0 }));
    cabinets[0].excludeFromPixelmap = true;
    const lines = createAutomaticPowerLines(cabinets, DEFAULT_LIBRARIES,
      { voltageV: 230, breakerA: 16, utilizationPercent: 100 }, [first, second]);
    expect(lines).toHaveLength(2);
    expect(lines.flatMap((line) => line.cabinetIds)).not.toContain(cabinets[0].id);
    expect(lines[1].cabinetIds[0]).toBe(cabinets.at(-1)!.id);
    for (const line of lines) {
      expect(new Set(line.cabinetIds.map((id) => cabinets.find((cabinet) => cabinet.id === id)!.screenId)).size).toBe(1);
    }
  });

  it("preserves other screens' main and backup ports and refuses insufficient free ports", () => {
    const retained = { id: "retained", portNumber: 1, cabinetIds: ["other"], color: "red", backupPortNumber: 4, backupControllerName: "Custom backup" };
    const replaced = { id: "old", portNumber: 2, cabinetIds: ["target"], color: "blue" };
    const generated = [{ id: "new", portNumber: 1, cabinetIds: ["target"], color: "green" }];
    const result = mergeAutomaticPortRuns([retained, replaced], new Set(["target"]), generated, 4, true, "Second controller");
    expect(result.runs[0]).toEqual(retained);
    expect(result.runs[1]).toMatchObject({ portNumber: 2, backupPortNumber: 3 });
    const insufficient = mergeAutomaticPortRuns([retained], new Set(["target"]), generated, 1, true, "Second controller");
    expect(insufficient.error).toBeDefined();
    expect(insufficient.runs).toEqual([retained]);
  });

  it("places new and existing screens separately and reports when the master is full", () => {
    const project = createDefaultProject();
    const screen = project.screens[0];
    project.cabinets = createCabinetGrid(screen, DEFAULT_LIBRARIES.cabinets[0], { rows: 2, columns: 3, rotation: 0 });
    const bounds = { x: 0, y: 0, width: 384, height: 256 };
    expect(findAvailableScreenPosition(project, DEFAULT_LIBRARIES.cabinets, "new", bounds)).toMatchObject({ canvasX: 416, canvasY: 0, fits: true });
    project.screens.push({ ...screen, id: "new", cabinetIds: [] });
    const arranged = arrangeScreens(project, DEFAULT_LIBRARIES.cabinets);
    expect(arranged.screens[1].canvasX).toBe(416);
    expect(project.screens[1].canvasX).toBe(0);
    project.canvasWidth = 384;
    project.canvasHeight = 256;
    expect(findAvailableScreenPosition(project, DEFAULT_LIBRARIES.cabinets, "new", bounds).fits).toBe(false);
  });
});
