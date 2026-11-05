import { describe, expect, it } from "vitest";
import { DEFAULT_LIBRARIES } from "../data/defaultLibraries";
import { createDefaultProject } from "../data/defaultProject";
import { parseProject } from "../platform/files";
import { addProjectCanvas, canvasProject, moveScreenToCanvas, projectCanvases, removeProjectCanvas, updateCanvasProject } from "./canvases";
import { createCabinetGrid, findAvailableScreenPosition } from "./layout";

function populatedProject() {
  const project = createDefaultProject();
  const screen = project.screens[0];
  project.cabinets = createCabinetGrid(screen, DEFAULT_LIBRARIES.cabinets[0], { rows: 2, columns: 3, rotation: 0 });
  screen.cabinetIds = project.cabinets.map((cabinet) => cabinet.id);
  project.controllers[0].portRuns = [{ id: "main-1", portNumber: 1, cabinetIds: [...screen.cabinetIds], color: "blue", backupPortNumber: 16, backupControllerName: "Custom backup" }];
  project.powerLines = [{ id: "power-1", canvasId: projectCanvases(project)[0].id, lineNumber: 1, cabinetIds: [...screen.cabinetIds], color: "red" }];
  return project;
}

describe("independent canvases", () => {
  it("migrates legacy projects without changing positions, cable order or backups", () => {
    const legacy = populatedProject();
    legacy.schemaVersion = 1;
    delete legacy.canvases;
    delete legacy.screens[0].canvasId;
    delete legacy.controllers[0].canvasId;
    delete legacy.powerLines[0].canvasId;
    legacy.screens[0].canvasX = 256;
    const loaded = parseProject(JSON.stringify(legacy));
    expect(loaded.schemaVersion).toBe(2);
    expect(projectCanvases(loaded)).toHaveLength(1);
    expect(loaded.cabinets).toMatchObject(legacy.cabinets);
    expect(loaded.controllers[0].portRuns).toEqual(legacy.controllers[0].portRuns);
    expect(loaded.screens[0]).toMatchObject({ canvasX: 256, canvasId: projectCanvases(loaded)[0].id });
    expect(canvasProject(loaded).powerLines).toHaveLength(1);
  });

  it("keeps dimensions, controller ports, circuits and settings independent", () => {
    const original = populatedProject();
    const first = projectCanvases(original)[0].id;
    let project = addProjectCanvas(original, "IMAG", "IMAG", first);
    const second = projectCanvases(project)[1].id;
    project = updateCanvasProject(project, second, (current) => {
      const screen = current.screens[0];
      const cabinets = createCabinetGrid(screen, DEFAULT_LIBRARIES.cabinets[0], { rows: 1, columns: 2, rotation: 90 });
      return { ...current, canvasWidth: 800, canvasHeight: 600,
        electrical: { ...current.electrical, breakerA: 10 }, rigging: { ...current.rigging, cableKgPerCabinet: 1.7 },
        screens: [{ ...screen, cabinetIds: cabinets.map((cabinet) => cabinet.id) }], cabinets,
        controllers: [{ ...current.controllers[0], modelId: "novastar-vx1000", portRuns: [{ id: "second-data", portNumber: 1, cabinetIds: cabinets.map((cabinet) => cabinet.id), color: "green" }] }],
        powerLines: [{ id: "second-power", lineNumber: 1, cabinetIds: cabinets.map((cabinet) => cabinet.id), color: "orange" }],
      };
    });
    const a = canvasProject(project, first);
    const b = canvasProject(project, second);
    expect(a.cabinets).toHaveLength(6);
    expect(b.cabinets).toHaveLength(2);
    expect(a.controllers[0]).toBe(original.controllers[0]);
    expect(a.powerLines[0]).toBe(original.powerLines[0]);
    expect(a.canvasWidth).toBe(3840);
    expect(b.canvasWidth).toBe(800);
    expect(a.electrical.breakerA).toBe(16);
    expect(b.electrical.breakerA).toBe(10);
    expect(b.rigging.cableKgPerCabinet).toBe(1.7);
    expect(b.controllers[0].canvasId).toBe(second);
    expect(b.powerLines[0].canvasId).toBe(second);
    expect(findAvailableScreenPosition(b, DEFAULT_LIBRARIES.cabinets, "new").canvasX).toBe(288);
    const reopened = parseProject(JSON.stringify(project));
    expect(canvasProject(reopened, second).cabinets).toMatchObject(b.cabinets);
    expect(canvasProject(reopened, first).controllers[0].portRuns).toEqual(a.controllers[0].portRuns);
    const remaining = removeProjectCanvas(project, first);
    expect(projectCanvases(remaining)).toHaveLength(1);
    expect(remaining.canvasWidth).toBe(800);
    expect(remaining.cabinets).toHaveLength(2);
    expect(removeProjectCanvas(remaining, second)).toBe(remaining);
  });

  it("moves a screen with its routes, assigns destination ports and keeps the source usable", () => {
    const original = populatedProject();
    const sourceId = projectCanvases(original)[0].id;
    const project = addProjectCanvas(original, "IMAG", "Empty", sourceId);
    const targetId = projectCanvases(project)[1].id;
    const result = moveScreenToCanvas(project, original.screens[0].id, targetId, DEFAULT_LIBRARIES);
    expect(result.error).toBeUndefined();
    const source = canvasProject(result.project, sourceId);
    const target = canvasProject(result.project, targetId);
    expect(source.screens).toHaveLength(1);
    expect(source.cabinets).toHaveLength(0);
    expect(source.controllers[0].portRuns).toHaveLength(0);
    expect(source.powerLines).toHaveLength(0);
    expect(target.screens).toHaveLength(1);
    expect(target.screens[0]).toMatchObject({ id: original.screens[0].id, canvasX: 0, canvasY: 0 });
    expect(target.controllers[0].portRuns[0].cabinetIds).toEqual(original.controllers[0].portRuns[0].cabinetIds);
    expect(target.powerLines[0].cabinetIds).toEqual(original.powerLines[0].cabinetIds);
    expect(project.controllers[0].portRuns).toHaveLength(1);
  });

  it("refuses a transfer that exceeds destination electrical limits without modifying the project", () => {
    let project = addProjectCanvas(populatedProject(), "Small supply", "Empty");
    const targetId = projectCanvases(project)[1].id;
    project = updateCanvasProject(project, targetId, (current) => ({ ...current, electrical: { ...current.electrical, breakerA: 1 } }));
    const result = moveScreenToCanvas(project, canvasProject(project).screens[0].id, targetId, DEFAULT_LIBRARIES);
    expect(result.error).toContain("linee elettriche");
    expect(result.project).toBe(project);
    expect(canvasProject(result.project).controllers[0].portRuns).toHaveLength(1);
  });

  it("keeps the original wiring when the destination controller cannot load its route", () => {
    let project = addProjectCanvas(populatedProject(), "Small controller", "Empty");
    const targetId = projectCanvases(project)[1].id;
    project = updateCanvasProject(project, targetId, (current) => ({ ...current,
      controllers: [{ ...current.controllers[0], modelId: "novastar-vx1000" }],
    }));
    const libraries = structuredClone(DEFAULT_LIBRARIES);
    libraries.controllers.find((model) => model.id === "novastar-vx1000")!.bandwidthPixelsPerSecond8Bit = 2 * 128 * 128 * 50;
    const result = moveScreenToCanvas(project, canvasProject(project).screens[0].id, targetId, libraries);
    expect(result.error).toContain("capacità");
    expect(result.project).toBe(project);
    expect(canvasProject(result.project).powerLines).toHaveLength(1);
  });
});
