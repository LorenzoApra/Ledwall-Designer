import { describe, expect, it } from "vitest";
import { DEFAULT_LIBRARIES } from "../data/defaultLibraries";
import { createDefaultProject } from "../data/defaultProject";
import { addProjectCanvas, projectCanvases, updateCanvasProject } from "../domain/canvases";
import { createCabinetGrid } from "../domain/layout";
import { calculatePowerLineMetrics } from "../domain/electrical";
import { exportScreenList, selectedCanvasProjects, uniqueExportFilename } from "./selection";

function fixture() {
  let project = createDefaultProject();
  const first = project.screens[0];
  const second = { ...first, id: "second-screen", name: first.name, cabinetIds: [] as string[] };
  const model = DEFAULT_LIBRARIES.cabinets[0];
  const cabinetsA = createCabinetGrid(first, model, { rows: 1, columns: 2, rotation: 0 });
  const cabinetsB = createCabinetGrid(second, model, { rows: 1, columns: 1, rotation: 0 });
  first.cabinetIds = cabinetsA.map((cabinet) => cabinet.id);
  second.cabinetIds = cabinetsB.map((cabinet) => cabinet.id);
  cabinetsA[0].excludeFromPixelmap = true;
  project.screens.push(second);
  project.cabinets = [...cabinetsA, ...cabinetsB];
  const ids = project.cabinets.map((cabinet) => cabinet.id);
  project.controllers[0].portRuns = [{ id: "shared-data", portNumber: 1, backupPortNumber: 16, color: "blue", cabinetIds: ids }];
  project.powerLines = [{ id: "shared-power", lineNumber: 1, color: "red", cabinetIds: ids }];
  project = addProjectCanvas(project, "OTHER", first.name);
  const canvasId = projectCanvases(project)[1].id;
  project = updateCanvasProject(project, canvasId, (scope) => {
    const screen = scope.screens[0];
    const cabinets = createCabinetGrid(screen, model, { rows: 1, columns: 1, rotation: 90 });
    cabinets[0].excludeFromPixelmap = true;
    return { ...scope, canvasWidth: 800, canvasHeight: 600, cabinets,
      screens: [{ ...screen, cabinetIds: cabinets.map((cabinet) => cabinet.id) }] };
  });
  return { project, first, second, model, ids };
}

describe("batch export selection", () => {
  it("lists independent canvases, duplicate names and structural-only screens separately", () => {
    const { project, model } = fixture();
    const rows = exportScreenList(project, DEFAULT_LIBRARIES);
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((row) => row.id)).size).toBe(3);
    expect(rows.map((row) => row.cabinetCount)).toEqual([2, 1, 1]);
    expect(rows.map((row) => row.activePixels)).toEqual([model.pixelWidth * model.pixelHeight, model.pixelWidth * model.pixelHeight, 0]);
    expect(rows[2].canvasName).toBe("OTHER");
  });

  it("filters documents to selected screens without mutating originals or renumbering shared routes", () => {
    const { project, second, ids, model } = fixture();
    const before = JSON.stringify(project);
    const scopes = selectedCanvasProjects(project, [second.id, "stale-id"]);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].screens.map((screen) => screen.id)).toEqual([second.id]);
    expect(scopes[0].cabinets).toHaveLength(1);
    expect(scopes[0].controllers[0].portRuns[0]).toMatchObject({ cabinetIds: ids, backupPortNumber: 16 });
    expect(scopes[0].powerLines[0].cabinetIds).toEqual(ids);
    expect(calculatePowerLineMetrics(scopes[0], DEFAULT_LIBRARIES)[0].maxW).toBe(model.powerMaxW);
    expect(JSON.stringify(project)).toBe(before);
    expect(selectedCanvasProjects(project, [])).toEqual([]);
  });

  it("keeps each selected canvas resolution and removes unrelated routes", () => {
    const { project } = fixture();
    const ids = project.screens.map((screen) => screen.id);
    const scopes = selectedCanvasProjects(project, ids);
    expect(scopes).toHaveLength(2);
    expect(scopes.map((scope) => scope.canvasWidth)).toEqual([3840, 800]);
    expect(scopes[1].powerLines).toHaveLength(0);
    expect(scopes[1].controllers[0].portRuns).toHaveLength(0);
  });

  it("prevents case-insensitive ZIP name collisions without losing an extension", () => {
    const used = new Set<string>();
    expect(uniqueExportFilename("Canvas - Screen.png", used)).toBe("Canvas - Screen.png");
    expect(uniqueExportFilename("canvas - screen.png", used)).toBe("canvas - screen (2).png");
    expect(uniqueExportFilename("Canvas - Screen.png", used)).toBe("Canvas - Screen (3).png");
    expect(uniqueExportFilename("Canvas - Screen.pdf", used)).toBe("Canvas - Screen.pdf");
  });
});
