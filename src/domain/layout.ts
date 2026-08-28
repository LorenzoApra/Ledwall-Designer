import { rotatedSize } from "./geometry";
import { createId } from "./id";
import type { CabinetInstance, CabinetModel, LedScreen, Rotation } from "./types";

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

