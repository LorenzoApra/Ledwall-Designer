import type {
  CabinetInstance,
  CabinetModel,
  LedScreen,
  Rotation,
} from "./types";

export interface Size {
  width: number;
  height: number;
}

export interface Bounds extends Size {
  x: number;
  y: number;
}

export function rotatedSize(width: number, height: number, rotation: Rotation): Size {
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}

export function cabinetPixelSize(
  cabinet: CabinetInstance,
  model: CabinetModel,
): Size {
  return rotatedSize(model.pixelWidth, model.pixelHeight, cabinet.rotation);
}

export function cabinetPhysicalSize(
  cabinet: CabinetInstance,
  model: CabinetModel,
): Size {
  return rotatedSize(model.widthMm, model.heightMm, cabinet.rotation);
}

export function cabinetPixelCount(model: CabinetModel): number {
  return model.pixelWidth * model.pixelHeight;
}

export function cabinetPixelCenter(
  cabinet: CabinetInstance,
  model: CabinetModel,
): { x: number; y: number } {
  const size = cabinetPixelSize(cabinet, model);
  return {
    x: cabinet.pixelX + size.width / 2,
    y: cabinet.pixelY + size.height / 2,
  };
}

export function cabinetPhysicalCenter(
  cabinet: CabinetInstance,
  model: CabinetModel,
): { x: number; y: number } {
  const size = cabinetPhysicalSize(cabinet, model);
  return {
    x: cabinet.physicalXmm + size.width / 2,
    y: cabinet.physicalYmm + size.height / 2,
  };
}

export function calculateScreenPixelBounds(
  screen: LedScreen,
  cabinets: CabinetInstance[],
  models: CabinetModel[],
): Bounds {
  const screenCabinets = cabinets.filter((cabinet) => cabinet.screenId === screen.id);
  if (screenCabinets.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const modelById = new Map(models.map((model) => [model.id, model]));
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const cabinet of screenCabinets) {
    const model = modelById.get(cabinet.modelId);
    if (!model) continue;
    const size = cabinetPixelSize(cabinet, model);
    minX = Math.min(minX, cabinet.pixelX);
    minY = Math.min(minY, cabinet.pixelY);
    maxX = Math.max(maxX, cabinet.pixelX + size.width);
    maxY = Math.max(maxY, cabinet.pixelY + size.height);
  }

  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function distanceBetweenCabinets(
  first: CabinetInstance,
  second: CabinetInstance,
  modelById: Map<string, CabinetModel>,
): number {
  const firstModel = modelById.get(first.modelId);
  const secondModel = modelById.get(second.modelId);
  if (!firstModel || !secondModel) return Number.POSITIVE_INFINITY;
  const a = cabinetPhysicalCenter(first, firstModel);
  const b = cabinetPhysicalCenter(second, secondModel);
  return Math.hypot(b.x - a.x, b.y - a.y);
}

