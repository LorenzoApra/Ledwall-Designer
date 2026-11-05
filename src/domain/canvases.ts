import { createId } from "./id";
import type { AppLibraries, ControllerInstance, LedScreen, LedwallProject, ProjectCanvas } from "./types";
import { calculateControllerCapacity, calculatePortMetrics } from "./capacity";
import { calculatePowerLineMetrics } from "./electrical";
import { calculateScreenPixelBounds } from "./geometry";
import { findAvailableScreenPosition } from "./layout";
import { mergeAutomaticPortRuns, portColor } from "./wiring";

export function projectCanvases(project: LedwallProject): ProjectCanvas[] {
  return project.canvases?.length ? project.canvases : [{
    id: `canvas-${project.id}`,
    name: "CANVAS 1",
    width: project.canvasWidth,
    height: project.canvasHeight,
    electrical: project.electrical,
    rigging: project.rigging,
  }];
}

export function emptyCanvasScreen(canvasId: string, name: string, template?: LedScreen): LedScreen {
  return {
    id: createId("screen"), canvasId, name, canvasX: 0, canvasY: 0,
    cabinetIds: [], suspensionPoints: [], supportPlates: [], flybars: [],
    pixelmap: template ? { ...template.pixelmap } : {
      showGrid: true, showCoordinates: true, showCircles: true, showDiagonals: true,
      showColorBars: true, showGrayscale: true, showScreenName: true,
      showResolution: true, showLogo: true,
    },
    dataPattern: template?.dataPattern ?? "columns-tl",
    powerPattern: template?.powerPattern ?? "rows-tl",
  };
}

function emptyCanvasController(canvasId: string, template?: ControllerInstance): ControllerInstance {
  return template ? { ...template, id: createId("controller"), canvasId, mode: { ...template.mode }, portRuns: [] } : {
    id: createId("controller"), canvasId, modelId: "novastar-mctrl4k", name: "MCTRL4K-1",
    mode: { frameRate: 50, bitDepth: 8, hdr: false, threeD: false, lowLatency: false, redundancy: true, safetyMarginPercent: 0 },
    portRuns: [],
  };
}

/** Upgrade single-canvas files without changing their layouts or cable order. */
export function normalizeProjectCanvases(project: LedwallProject): LedwallProject {
  const canvases = projectCanvases(project).map((canvas) => ({
    ...canvas, electrical: { ...(canvas.electrical ?? project.electrical) },
    rigging: { ...(canvas.rigging ?? project.rigging) },
  }));
  const first = canvases[0];
  const valid = new Set(canvases.map((canvas) => canvas.id));
  const canvasId = (id?: string) => id && valid.has(id) ? id : first.id;
  const screens: LedScreen[] = project.screens.map((screen) => ({ ...screen, canvasId: canvasId(screen.canvasId) }));
  const controllers: ControllerInstance[] = project.controllers.map((controller) => ({ ...controller, canvasId: canvasId(controller.canvasId) }));
  for (const canvas of canvases) {
    if (!screens.some((screen) => screen.canvasId === canvas.id)) screens.push(emptyCanvasScreen(canvas.id, "SCREEN 1"));
    if (!controllers.some((controller) => controller.canvasId === canvas.id)) controllers.push(emptyCanvasController(canvas.id, controllers[0]));
  }
  const screenCanvas = new Map(screens.map((screen) => [screen.id, screen.canvasId]));
  const cabinetCanvas = new Map(project.cabinets.map((cabinet) => [cabinet.id, screenCanvas.get(cabinet.screenId)]));
  const powerLines = project.powerLines.map((line) => ({
    ...line, canvasId: canvasId(line.canvasId ?? cabinetCanvas.get(line.cabinetIds[0])),
  }));
  return { ...project, schemaVersion: 2, canvases, screens, controllers, powerLines,
    canvasWidth: first.width, canvasHeight: first.height, electrical: first.electrical, rigging: first.rigging };
}

/** A working view uses the existing design engines with only one canvas's data. */
export function canvasProject(project: LedwallProject, canvasId?: string): LedwallProject {
  const canvases = projectCanvases(project);
  const canvas = canvases.find((item) => item.id === canvasId) ?? canvases[0];
  const belongs = (id?: string) => (id ?? canvases[0].id) === canvas.id;
  const screens = project.screens.filter((screen) => belongs(screen.canvasId));
  const screenIds = new Set(screens.map((screen) => screen.id));
  const cabinets = project.cabinets.filter((cabinet) => screenIds.has(cabinet.screenId));
  const cabinetIds = new Set(cabinets.map((cabinet) => cabinet.id));
  return { ...project, canvases: [canvas],
    canvasWidth: canvas.width, canvasHeight: canvas.height,
    electrical: canvas.electrical, rigging: canvas.rigging,
    screens, cabinets,
    controllers: project.controllers.filter((controller) => belongs(controller.canvasId)),
    powerLines: project.powerLines.filter((line) => line.canvasId ? belongs(line.canvasId) : line.cabinetIds.some((id) => cabinetIds.has(id))),
  };
}

/** Merge an edit into its canvas; other canvases retain their objects and routing. */
export function updateCanvasProject(
  project: LedwallProject,
  canvasId: string,
  update: (current: LedwallProject) => LedwallProject,
): LedwallProject {
  const current = canvasProject(project, canvasId);
  const next = update(current);
  if (next === current) return project;
  const activeId = current.canvases![0].id;
  const screenIds = new Set(current.screens.map((screen) => screen.id));
  const controllerIds = new Set(current.controllers.map((controller) => controller.id));
  const lineIds = new Set(current.powerLines.map((line) => line.id));
  const canvases = projectCanvases(project).map((canvas) => canvas.id === activeId ? {
    ...canvas, width: next.canvasWidth, height: next.canvasHeight,
    electrical: next.electrical, rigging: next.rigging,
  } : canvas);
  const first = canvases[0];
  return { ...project, schemaVersion: 2, canvases, metadata: next.metadata,
    canvasWidth: first.width, canvasHeight: first.height, electrical: first.electrical, rigging: first.rigging,
    screens: [...project.screens.filter((screen) => !screenIds.has(screen.id)), ...next.screens.map((screen) => ({ ...screen, canvasId: activeId }))],
    cabinets: [...project.cabinets.filter((cabinet) => !screenIds.has(cabinet.screenId)), ...next.cabinets],
    controllers: [...project.controllers.filter((controller) => !controllerIds.has(controller.id)), ...next.controllers.map((controller) => ({ ...controller, canvasId: activeId }))],
    powerLines: [...project.powerLines.filter((line) => !lineIds.has(line.id)), ...next.powerLines.map((line) => ({ ...line, canvasId: activeId }))],
  };
}

export function addProjectCanvas(project: LedwallProject, name: string, screenName: string, templateId?: string): LedwallProject {
  const template = canvasProject(project, templateId);
  const source = template.canvases![0];
  const canvas: ProjectCanvas = { ...source, id: createId("canvas"), name,
    electrical: { ...source.electrical }, rigging: { ...source.rigging } };
  return { ...project, schemaVersion: 2, canvases: [...projectCanvases(project), canvas],
    screens: [...project.screens, emptyCanvasScreen(canvas.id, screenName, template.screens[0])],
    controllers: [...project.controllers, emptyCanvasController(canvas.id, template.controllers[0])],
  };
}

export function removeProjectCanvas(project: LedwallProject, canvasId: string): LedwallProject {
  const canvases = projectCanvases(project).filter((canvas) => canvas.id !== canvasId);
  if (!canvases.length || canvases.length === projectCanvases(project).length) return project;
  const removed = canvasProject(project, canvasId);
  const screenIds = new Set(removed.screens.map((screen) => screen.id));
  const controllerIds = new Set(removed.controllers.map((controller) => controller.id));
  const lineIds = new Set(removed.powerLines.map((line) => line.id));
  const first = canvases[0];
  return { ...project, canvases,
    canvasWidth: first.width, canvasHeight: first.height, electrical: first.electrical, rigging: first.rigging,
    screens: project.screens.filter((screen) => !screenIds.has(screen.id)),
    cabinets: project.cabinets.filter((cabinet) => !screenIds.has(cabinet.screenId)),
    controllers: project.controllers.filter((controller) => !controllerIds.has(controller.id)),
    powerLines: project.powerLines.filter((line) => !lineIds.has(line.id)),
  };
}

export function moveScreenToCanvas(
  project: LedwallProject, screenId: string, targetCanvasId: string, libraries: AppLibraries,
): { project: LedwallProject; error?: string } {
  const screen = project.screens.find((item) => item.id === screenId);
  const firstId = projectCanvases(project)[0].id;
  const sourceId = screen?.canvasId ?? firstId;
  if (!screen || sourceId === targetCanvasId || !projectCanvases(project).some((canvas) => canvas.id === targetCanvasId)) return { project };
  const source = canvasProject(project, sourceId);
  const target = canvasProject(project, targetCanvasId);
  const ids = new Set(project.cabinets.filter((cabinet) => cabinet.screenId === screen.id).map((cabinet) => cabinet.id));
  const generated = source.controllers.flatMap((controller) => controller.portRuns
    .map((run) => ({ ...run, id: createId("port-run"), cabinetIds: run.cabinetIds.filter((id) => ids.has(id)) }))
    .filter((run) => run.cabinetIds.length > 0));
  const destination = target.controllers[0];
  const model = libraries.controllers.find((item) => item.id === destination?.modelId);
  if (!destination || !model) return { project, error: "Il controller del canvas di destinazione non è disponibile." };
  const merged = mergeAutomaticPortRuns(destination.portRuns, ids, generated, model.ethernetPorts,
    destination.mode.redundancy, `Backup ${destination.name}`);
  if (merged.error) return { project, error: merged.error };

  const placeholder = target.screens.length === 1 && !target.cabinets.length &&
    !target.screens[0].supportPlates.length && !target.screens[0].flybars.length && !target.screens[0].suspensionPoints.length
    ? target.screens[0] : undefined;
  const layoutTarget = placeholder ? { ...target, screens: [] } : target;
  const position = findAvailableScreenPosition(layoutTarget, libraries.cabinets, screen.id,
    calculateScreenPixelBounds(screen, project.cabinets, libraries.cabinets));
  const remainingSourceScreens = source.screens.filter((item) => item.id !== screen.id);
  const movedScreen = { ...screen, canvasId: targetCanvasId, canvasX: position.canvasX, canvasY: position.canvasY };
  const movedPower = source.powerLines.map((line) => ({ ...line,
    id: createId("power-line"), cabinetIds: line.cabinetIds.filter((id) => ids.has(id)), canvasId: targetCanvasId,
  })).filter((line) => line.cabinetIds.length > 0);
  const usedNumbers = new Set(target.powerLines.map((line) => line.lineNumber));
  let number = 1;
  movedPower.forEach((line) => {
    while (usedNumbers.has(number)) number += 1;
    line.lineNumber = number++;
    line.color = portColor(line.lineNumber - 1);
  });
  const sourceControllerIds = new Set(source.controllers.map((controller) => controller.id));
  const sourceLineIds = new Set(source.powerLines.map((line) => line.id));
  const next: LedwallProject = { ...project,
    screens: [
      ...project.screens.filter((item) => item.id !== screen.id && item.id !== placeholder?.id), movedScreen,
      ...(!remainingSourceScreens.length ? [emptyCanvasScreen(sourceId, screen.name, screen)] : []),
    ],
    controllers: project.controllers.map((controller) => controller.id === destination.id ? { ...controller, portRuns: merged.runs }
      : sourceControllerIds.has(controller.id) ? { ...controller, portRuns: controller.portRuns.map((run) => ({ ...run, cabinetIds: run.cabinetIds.filter((id) => !ids.has(id)) })).filter((run) => run.cabinetIds.length > 0) } : controller),
    powerLines: [...project.powerLines.map((line) => sourceLineIds.has(line.id)
      ? { ...line, cabinetIds: line.cabinetIds.filter((id) => !ids.has(id)) } : line).filter((line) => line.cabinetIds.length > 0), ...movedPower],
  };
  const targetView = canvasProject(next, targetCanvasId);
  const targetController = targetView.controllers.find((controller) => controller.id === destination.id)!;
  const metrics = calculatePortMetrics(targetView, libraries, targetController);
  const newRunIds = new Set(generated.map((run) => run.id));
  const totalLoad = metrics.reduce((sum, metric) => sum + metric.loadingPixels, 0);
  if (metrics.some((metric) => newRunIds.has(metric.run.id) && !metric.valid) ||
    totalLoad > calculateControllerCapacity(model, targetController).totalCapacityPixels) {
    return { project, error: "Il cablaggio supera la capacità del controller di destinazione. Modifica il controller o il percorso prima di spostare lo schermo." };
  }
  const newPowerIds = new Set(movedPower.map((line) => line.id));
  if (calculatePowerLineMetrics(targetView, libraries).some((metric) => newPowerIds.has(metric.line.id) && !metric.valid)) {
    return { project, error: "Le linee elettriche superano il limite del canvas di destinazione. Modifica il limite o il cablaggio prima di spostare lo schermo." };
  }
  return { project: next };
}
