import { calculateScreenPixelBounds, rotatedSize, type Bounds } from "./geometry";
import { createId } from "./id";
import type { CabinetInstance, CabinetModel, LedScreen, LedwallProject, Rotation } from "./types";

export interface GridOptions {
  rows: number;
  columns: number;
  rotation: Rotation;
  startPixelX?: number;
  startPixelY?: number;
  startPhysicalXmm?: number;
  startPhysicalYmm?: number;
}

export function createCabinetGrid(
  screen: LedScreen,
  model: CabinetModel,
  options: GridOptions,
): CabinetInstance[] {
  const rows = Math.max(1, Math.floor(options.rows));
  const columns = Math.max(1, Math.floor(options.columns));
  const pixelSize = rotatedSize(model.pixelWidth, model.pixelHeight, options.rotation);
  const physicalSize = rotatedSize(model.widthMm, model.heightMm, options.rotation);
  const cabinets: CabinetInstance[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cabinets.push({
        id: createId("cabinet"),
        screenId: screen.id,
        modelId: model.id,
        row: row + 1,
        column: column + 1,
        pixelX: (options.startPixelX ?? 0) + column * pixelSize.width,
        pixelY: (options.startPixelY ?? 0) + row * pixelSize.height,
        physicalXmm: (options.startPhysicalXmm ?? 0) + column * physicalSize.width,
        physicalYmm: (options.startPhysicalYmm ?? 0) + row * physicalSize.height,
        rotation: options.rotation,
      });
    }
  }

  return cabinets;
}

export function replaceScreenCabinets(
  allCabinets: CabinetInstance[],
  screenId: string,
  replacement: CabinetInstance[],
): CabinetInstance[] {
  return [...allCabinets.filter((cabinet) => cabinet.screenId !== screenId), ...replacement];
}

/** Find an unoccupied master-canvas position without changing existing screens. */
export function findAvailableScreenPosition(
  project: LedwallProject,
  models: CabinetModel[],
  screenId: string,
  bounds: Bounds = { x: 0, y: 0, width: 256, height: 256 },
): { canvasX: number; canvasY: number; fits: boolean } {
  const gap = 32;
  const occupied = project.screens.filter((screen) => screen.id !== screenId).map((screen) => {
    const box = calculateScreenPixelBounds(screen, project.cabinets, models);
    return {
      x: screen.canvasX + box.x,
      y: screen.canvasY + box.y,
      width: box.width || 256,
      height: box.height || 256,
    };
  });
  const xs = [...new Set([0, ...occupied.map((box) => box.x + box.width + gap)])].sort((a, b) => a - b);
  const ys = [...new Set([0, ...occupied.map((box) => box.y + box.height + gap)])].sort((a, b) => a - b);
  for (const y of ys) {
    for (const x of xs) {
      if (x + bounds.width > project.canvasWidth || y + bounds.height > project.canvasHeight) continue;
      if (occupied.some((box) => x < box.x + box.width + gap && x + bounds.width + gap > box.x &&
        y < box.y + box.height + gap && y + bounds.height + gap > box.y)) continue;
      return { canvasX: x - bounds.x, canvasY: y - bounds.y, fits: true };
    }
  }
  // Keep the screen accessible outside the canvas when the master has no free room.
  return {
    canvasX: Math.max(0, ...occupied.map((box) => box.x + box.width + gap)) - bounds.x,
    canvasY: -bounds.y,
    fits: false,
  };
}

export function arrangeScreens(project: LedwallProject, models: CabinetModel[]): LedwallProject {
  const arranged: LedwallProject = { ...project, screens: [] };
  for (const screen of project.screens) {
    const bounds = calculateScreenPixelBounds(screen, project.cabinets, models);
    const position = findAvailableScreenPosition(arranged, models, screen.id,
      bounds.width ? bounds : undefined);
    arranged.screens.push({ ...screen, canvasX: position.canvasX, canvasY: position.canvasY });
  }
  return arranged;
}
