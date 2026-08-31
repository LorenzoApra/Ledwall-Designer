import { describe, expect, it } from "vitest";
import { calculateControllerCapacity } from "./capacity";
import {
  appendCabinetToPowerLine,
  calculatePowerLineMetrics,
  createAutomaticPowerLines,
  removeCabinetFromPowerLines,
  undoLastCabinetFromPowerLine,
} from "./electrical";
import { createCabinetGrid } from "./layout";
import { createAutomaticSupportPlates } from "./supportPlates";
import { parseRcfgXml } from "./rcfg";
import { calculateFlybarMetrics } from "./flybars";
import {
  appendCabinetToPortRun,
  createAutoWiring,
  removeCabinetFromPortRuns,
  undoLastCabinetFromPortRun,
} from "./wiring";
import {
  calculateEstimatedProjectWeightKg,
  calculateSuspensionMetrics,
  createAutomaticSuspensionPoints,
} from "./weight";
import { DEFAULT_LIBRARIES } from "../data/defaultLibraries";
import { createDefaultProject } from "../data/defaultProject";

describe("motore Ledwall Designer", () => {
  it("calcola la capacita MCTRL4K a 50 Hz e applica il margine una volta", () => {
    const project = createDefaultProject();
    const controller = project.controllers[0];
    const model = DEFAULT_LIBRARIES.controllers.find((item) => item.id === controller.modelId)!;
    const nominal = calculateControllerCapacity(model, controller);
    expect(nominal.portCapacityPixels).toBe(780_000);
    expect(nominal.totalCapacityPixels).toBe(8_800_000);

    controller.mode.safetyMarginPercent = 10;
    const withMargin = calculateControllerCapacity(model, controller);
    expect(withMargin.portCapacityPixels).toBe(702_000);
    expect(withMargin.totalCapacityPixels).toBe(7_920_000);
  });

  it("riduce la capacita per bit depth elevato e 3D", () => {
    const project = createDefaultProject();
    const controller = project.controllers[0];
    const model = DEFAULT_LIBRARIES.controllers.find((item) => item.id === controller.modelId)!;
    controller.mode.bitDepth = 10;
    expect(calculateControllerCapacity(model, controller).portCapacityPixels).toBe(384_000);
    controller.mode.threeD = true;
    expect(calculateControllerCapacity(model, controller).portCapacityPixels).toBe(192_000);
  });

  it("genera una matrice Yestech con coordinate pixel e fisiche coerenti", () => {
    const project = createDefaultProject();
    const model = DEFAULT_LIBRARIES.cabinets[0];
    const grid = createCabinetGrid(project.screens[0], model, {
      rows: 8,
      columns: 5,
      rotation: 0,
    });
    expect(grid).toHaveLength(40);
    expect(grid.at(-1)).toMatchObject({
      row: 8,
      column: 5,
      pixelX: 512,
      pixelY: 896,
      physicalXmm: 2000,
      physicalYmm: 3500,
    });
  });

  it("sceglie il minor numero di porte e conserva tutti i cabinet", () => {
    const project = createDefaultProject();
    const model = DEFAULT_LIBRARIES.cabinets[0];
    const grid = createCabinetGrid(project.screens[0], model, {
      rows: 8,
      columns: 10,
      rotation: 0,
    });
    const result = createAutoWiring(
      project.screens[0],
      grid,
      project.controllers[0],
      DEFAULT_LIBRARIES,
    );
    expect(result.runs).toHaveLength(2);
    expect(result.runs.flatMap((run) => run.cabinetIds)).toHaveLength(80);
    expect(new Set(result.runs.flatMap((run) => run.cabinetIds)).size).toBe(80);
  });

  it("esclude i cabinet fuori pixelmap dai cablaggi automatici", () => {
    const project = createDefaultProject();
    const grid = createCabinetGrid(project.screens[0], DEFAULT_LIBRARIES.cabinets[0], {
      rows: 2,
      columns: 4,
      rotation: 0,
    });
    grid[2].excludeFromPixelmap = true;
    grid[6].excludeFromPixelmap = true;
    const wiring = createAutoWiring(
      project.screens[0],
      grid,
      project.controllers[0],
      DEFAULT_LIBRARIES,
    );
    const power = createAutomaticPowerLines(grid, DEFAULT_LIBRARIES, project.electrical);
    expect(wiring.runs.flatMap((run) => run.cabinetIds)).toHaveLength(6);
    expect(power.flatMap((line) => line.cabinetIds)).toHaveLength(6);
    expect(wiring.runs.flatMap((run) => run.cabinetIds)).not.toContain(grid[2].id);
    expect(power.flatMap((line) => line.cabinetIds)).not.toContain(grid[6].id);
  });

  it("costruisce, corregge e scollega un percorso manuale", () => {
    let runs = appendCabinetToPortRun([], 2, "cabinet-1");
    runs = appendCabinetToPortRun(runs, 2, "cabinet-2");
    runs = appendCabinetToPortRun(runs, 2, "cabinet-3");
    expect(runs[0]).toMatchObject({
      portNumber: 2,
      cabinetIds: ["cabinet-1", "cabinet-2", "cabinet-3"],
    });

    const undone = undoLastCabinetFromPortRun(runs, 2);
    expect(undone.removedCabinetId).toBe("cabinet-3");
    expect(undone.nextCabinetId).toBe("cabinet-2");
    expect(undone.runs[0].cabinetIds).toEqual(["cabinet-1", "cabinet-2"]);

    const removed = removeCabinetFromPortRuns(undone.runs, "cabinet-1");
    expect(removed[0].cabinetIds).toEqual(["cabinet-2"]);
  });

  it("sposta un cabinet tra porte senza duplicarlo", () => {
    let runs = appendCabinetToPortRun([], 1, "cabinet-1");
    runs = appendCabinetToPortRun(runs, 2, "cabinet-1");
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ portNumber: 2, cabinetIds: ["cabinet-1"] });
  });

  it("distribuisce 40 cabinet su tre linee da 16 A con derating 80%", () => {
    const project = createDefaultProject();
    const grid = createCabinetGrid(project.screens[0], DEFAULT_LIBRARIES.cabinets[0], {
      rows: 8,
      columns: 5,
      rotation: 0,
    });
    project.cabinets = grid;
    project.powerLines = createAutomaticPowerLines(
      grid,
      DEFAULT_LIBRARIES,
      project.electrical,
    );
    const metrics = calculatePowerLineMetrics(project, DEFAULT_LIBRARIES);
    expect(metrics).toHaveLength(3);
    expect(metrics.every((metric) => metric.valid)).toBe(true);
    expect(metrics.reduce((sum, metric) => sum + metric.line.cabinetIds.length, 0)).toBe(40);
  });

  it("costruisce e corregge una linea elettrica manuale", () => {
    let lines = appendCabinetToPowerLine([], 1, "cabinet-1");
    lines = appendCabinetToPowerLine(lines, 1, "cabinet-2");
    lines = appendCabinetToPowerLine(lines, 1, "cabinet-3");
    expect(lines[0].cabinetIds).toEqual(["cabinet-1", "cabinet-2", "cabinet-3"]);

    const undone = undoLastCabinetFromPowerLine(lines, 1);
    expect(undone.removedCabinetId).toBe("cabinet-3");
    expect(undone.nextCabinetId).toBe("cabinet-2");

    const removed = removeCabinetFromPowerLines(undone.lines, "cabinet-1");
    expect(removed[0].cabinetIds).toEqual(["cabinet-2"]);
  });

  it("sposta un cabinet tra linee elettriche senza duplicarlo", () => {
    let lines = appendCabinetToPowerLine([], 1, "cabinet-1");
    lines = appendCabinetToPowerLine(lines, 2, "cabinet-1");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ lineNumber: 2, cabinetIds: ["cabinet-1"] });
  });

  it("calcola un punto di sospensione per colonna", () => {
    const project = createDefaultProject();
    const screen = project.screens[0];
    project.cabinets = createCabinetGrid(screen, DEFAULT_LIBRARIES.cabinets[0], {
      rows: 8,
      columns: 5,
      rotation: 0,
    });
    screen.suspensionPoints = createAutomaticSuspensionPoints(
      screen,
      project.cabinets,
      DEFAULT_LIBRARIES,
    );
    const metrics = calculateSuspensionMetrics(project, DEFAULT_LIBRARIES);
    expect(metrics).toHaveLength(5);
    expect(metrics[0].totalWeightKg).toBeCloseTo(70.6, 5);
  });

  it("genera una fila di piastre MG7S sul bordo superiore a 4 m", () => {
    const project = createDefaultProject();
    const screen = project.screens[0];
    const cabinets = createCabinetGrid(screen, DEFAULT_LIBRARIES.cabinets[0], {
      rows: 8,
      columns: 5,
      rotation: 0,
    });
    const plan = createAutomaticSupportPlates(
      screen,
      cabinets,
      DEFAULT_LIBRARIES,
      "simple",
    );
    expect(plan.required).toBe(true);
    expect(plan.heightMm).toBe(4000);
    expect(plan.plates).toHaveLength(4);
    expect(plan.plates.every((plate) => plate.yMm === 0)).toBe(true);
    expect(plan.plates.every((plate) => plate.cabinetIds.length === 2)).toBe(true);
  });

  it("genera la fila a 4 m dal bordo inferiore per uno schermo da 6 m", () => {
    const project = createDefaultProject();
    const screen = project.screens[0];
    const cabinets = createCabinetGrid(screen, DEFAULT_LIBRARIES.cabinets[0], {
      rows: 12,
      columns: 5,
      rotation: 0,
    });
    const plan = createAutomaticSupportPlates(screen, cabinets, DEFAULT_LIBRARIES, "simple");
    expect(plan.plates).toHaveLength(4);
    expect(plan.plates.every((plate) => plate.yMm === 2000)).toBe(true);
    expect(plan.plates.every((plate) => plate.cabinetIds.length === 4)).toBe(true);
  });

  it("avvisa quando la struttura sospesa supera 12 m", () => {
    const project = createDefaultProject();
    const screen = project.screens[0];
    const cabinets = createCabinetGrid(screen, DEFAULT_LIBRARIES.cabinets[0], {
      rows: 25,
      columns: 2,
      rotation: 0,
    });
    const plan = createAutomaticSupportPlates(
      screen,
      cabinets,
      DEFAULT_LIBRARIES,
      "aliscaf",
    );
    expect(plan.warnings.some((warning) => warning.includes("12 m"))).toBe(true);
  });

  it("include il peso delle piastre nel totale e lo ripartisce sui punti", () => {
    const project = createDefaultProject();
    const screen = project.screens[0];
    const cabinets = createCabinetGrid(screen, DEFAULT_LIBRARIES.cabinets[0], {
      rows: 8,
      columns: 5,
      rotation: 0,
    });
    project.cabinets = cabinets;
    screen.cabinetIds = cabinets.map((cabinet) => cabinet.id);
    screen.suspensionPoints = createAutomaticSuspensionPoints(
      screen,
      cabinets,
      DEFAULT_LIBRARIES,
    );
    screen.supportPlates = createAutomaticSupportPlates(
      screen,
      cabinets,
      DEFAULT_LIBRARIES,
      "simple",
    ).plates;
    project.rigging.simplePlateWeightKg = 0.5;

    expect(calculateEstimatedProjectWeightKg(project, DEFAULT_LIBRARIES)).toBeCloseTo(355);
    const pointTotal = calculateSuspensionMetrics(project, DEFAULT_LIBRARIES)
      .reduce((sum, metric) => sum + metric.totalWeightKg, 0);
    expect(pointTotal).toBeCloseTo(355);
  });

  it("calcola carico, portata e peso proprio di una flybar", () => {
    const project = createDefaultProject();
    const screen = project.screens[0];
    const libraries = structuredClone(DEFAULT_LIBRARIES);
    libraries.flybars[0].weightKg = 5;
    const cabinets = createCabinetGrid(screen, libraries.cabinets[0], {
      rows: 8,
      columns: 1,
      rotation: 0,
    });
    project.cabinets = cabinets;
    screen.cabinetIds = cabinets.map((cabinet) => cabinet.id);
    screen.flybars = [{ id: "fb-1", modelId: libraries.flybars[0].id, label: "FB1", mode: "hanging", xMm: 0, yMm: 0, cabinetIds: cabinets.map((cabinet) => cabinet.id) }];
    const metric = calculateFlybarMetrics(project, libraries)[0];
    expect(metric.supportedLoadKg).toBeCloseTo(65.6);
    expect(metric.utilizationPercent).toBeCloseTo(32.8);
    expect(metric.valid).toBe(true);
    expect(calculateEstimatedProjectWeightKg(project, libraries)).toBeCloseTo(70.6);
  });

  it("mostra il peso stimato anche prima di generare i punti", () => {
    const project = createDefaultProject();
    const screen = project.screens[0];
    const model = DEFAULT_LIBRARIES.cabinets[0];
    const cabinets = createCabinetGrid(screen, model, {
      rows: 8,
      columns: 5,
      rotation: 0,
    });
    project.cabinets = cabinets;
    screen.cabinetIds = cabinets.map((cabinet) => cabinet.id);

    expect(calculateEstimatedProjectWeightKg(project, DEFAULT_LIBRARIES)).toBeCloseTo(328);

    screen.suspensionPoints = createAutomaticSuspensionPoints(
      screen,
      cabinets,
      DEFAULT_LIBRARIES,
    );
    expect(calculateEstimatedProjectWeightKg(project, DEFAULT_LIBRARIES)).toBeCloseTo(353);
  });

  it("legge i dati tecnici essenziali da un XML RCFG NovaStar", () => {
    const data = parseRcfgXml("test.rcfg", `
      <ScanBoardProperty>
        <ConfigFileVersion><ScanBoardName>A8s-N</ScanBoardName></ConfigFileVersion>
        <StandardLedModuleProp>
          <ModulePixelCols>64</ModulePixelCols>
          <ModulePixelRows>22</ModulePixelRows>
          <ScanType>Scan_11</ScanType>
        </StandardLedModuleProp>
        <Width>128</Width><Height>128</Height>
      </ScanBoardProperty>
    `);
    expect(data).toMatchObject({
      pixelWidth: 128,
      pixelHeight: 128,
      modulePixelWidth: 64,
      modulePixelHeight: 22,
      scan: "1/11",
      receivingCard: "A8s-N",
    });
  });
});
