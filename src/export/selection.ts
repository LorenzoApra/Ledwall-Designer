import { canvasProject, projectCanvases } from "../domain/canvases";
import type { AppLibraries, LedwallProject } from "../domain/types";

export interface ExportScreen {
  id: string;
  name: string;
  canvasId: string;
  canvasName: string;
  cabinetCount: number;
  activePixels: number;
}

export function exportScreenList(project: LedwallProject, libraries: AppLibraries): ExportScreen[] {
  const models = new Map(libraries.cabinets.map((model) => [model.id, model]));
  return projectCanvases(project).flatMap((canvas) => {
    const view = canvasProject(project, canvas.id);
    return view.screens.map((screen) => {
      const cabinets = view.cabinets.filter((cabinet) => cabinet.screenId === screen.id);
      const activePixels = cabinets.reduce((sum, cabinet) => {
        const model = models.get(cabinet.modelId);
        return sum + (!cabinet.excludeFromPixelmap && model ? model.pixelWidth * model.pixelHeight : 0);
      }, 0);
      return { id: screen.id, name: screen.name, canvasId: canvas.id, canvasName: canvas.name, cabinetCount: cabinets.length, activePixels };
    });
  });
}

/** Keep original route IDs/order: receiving-card numbers must not be renumbered. */
export function selectedCanvasProjects(project: LedwallProject, screenIds: string[]): LedwallProject[] {
  const selected = new Set(screenIds);
  return projectCanvases(project).flatMap((canvas) => {
    const view = canvasProject(project, canvas.id);
    const screens = view.screens.filter((screen) => selected.has(screen.id));
    if (!screens.length) return [];
    const ids = new Set(screens.map((screen) => screen.id));
    const cabinets = view.cabinets.filter((cabinet) => ids.has(cabinet.screenId));
    const cabinetIds = new Set(cabinets.map((cabinet) => cabinet.id));
    return [{ ...view, screens, cabinets,
      controllers: view.controllers.map((controller) => ({ ...controller,
        portRuns: controller.portRuns.filter((run) => run.cabinetIds.some((id) => cabinetIds.has(id))),
      })),
      powerLines: view.powerLines.filter((line) => line.cabinetIds.some((id) => cabinetIds.has(id))),
    }];
  });
}

export function uniqueExportFilename(name: string, used: Set<string>): string {
  const dot = name.lastIndexOf(".");
  const stem = dot >= 0 ? name.slice(0, dot) : name;
  const extension = dot >= 0 ? name.slice(dot) : "";
  let candidate = name;
  let index = 2;
  while (used.has(candidate.toLocaleLowerCase("en"))) candidate = `${stem} (${index++})${extension}`;
  used.add(candidate.toLocaleLowerCase("en"));
  return candidate;
}
