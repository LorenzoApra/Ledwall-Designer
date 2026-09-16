import type {
  AppLibraries,
  CapacityResult,
  ControllerInstance,
  ControllerModel,
  LedwallProject,
  PortMetrics,
} from "./types";
import { cabinetPixelCount, cabinetPixelSize } from "./geometry";
import type { CabinetInstance, CabinetModel } from "./types";

export interface PixelLoad {
  actualPixels: number;
  loadingPixels: number;
  virtualPixels: number;
  widthPixels: number;
  heightPixels: number;
}

export function calculateControllerCapacity(
  model: ControllerModel,
  controller: ControllerInstance,
): CapacityResult {
  const warnings: string[] = [];
  const mode = controller.mode;

  if (!model.capabilities.frameRates.includes(mode.frameRate)) {
    warnings.push(`${model.name}: ${mode.frameRate} Hz non e elencato tra i frame rate supportati.`);
  }
  if (!model.capabilities.bitDepths.includes(mode.bitDepth)) {
    warnings.push(`${model.name}: profondita ${mode.bitDepth} bit non supportata dal profilo.`);
  }
  if (mode.hdr && !model.capabilities.hdr) {
    warnings.push(`${model.name}: HDR non supportato.`);
  }
  if (mode.threeD && !model.capabilities.threeD) {
    warnings.push(`${model.name}: 3D non supportato.`);
  }
  if (mode.lowLatency && !model.capabilities.lowLatency) {
    warnings.push(`${model.name}: low latency non supportata.`);
  }
  if (mode.redundancy && !model.capabilities.portBackup) {
    warnings.push(`${model.name}: backup di porta non supportato.`);
  }

  const effectiveHighBit = mode.bitDepth > 8 || mode.hdr;
  const pixelsPerSecond = effectiveHighBit
    ? model.bandwidthPixelsPerSecondHighBit
    : model.bandwidthPixelsPerSecond8Bit;
  const threeDFactor = mode.threeD ? 0.5 : 1;
  const safetyFactor = Math.max(0, Math.min(1, 1 - mode.safetyMarginPercent / 100));
  const rawPortCapacity = (pixelsPerSecond / mode.frameRate) * threeDFactor;
  const portCapacityPixels = Math.floor(rawPortCapacity * safetyFactor);
  const totalByPorts = rawPortCapacity * model.ethernetPorts;
  const totalBase = mode.threeD
    ? Math.floor(model.totalCapacityPixels * 0.5)
    : model.totalCapacityPixels;
  const totalCapacityPixels = Math.floor(Math.min(totalBase, totalByPorts) * safetyFactor);

  if (mode.hdr && mode.bitDepth === 8) {
    warnings.push("HDR usa internamente il profilo di capacita 10/12 bit anche se e selezionato 8 bit.");
  }
  if (mode.lowLatency) {
    warnings.push("Low latency: verificare il vincolo di caricamento verticale previsto da NovaStar.");
  }

  return { portCapacityPixels, totalCapacityPixels, warnings };
}

export function calculatePortMetrics(
  project: LedwallProject,
  libraries: AppLibraries,
  controller: ControllerInstance,
): PortMetrics[] {
  const model = libraries.controllers.find((item) => item.id === controller.modelId);
  if (!model) return [];
  const capacity = calculateControllerCapacity(model, controller);
  const cabinetById = new Map(project.cabinets.map((cabinet) => [cabinet.id, cabinet]));
  const modelById = new Map(libraries.cabinets.map((item) => [item.id, item]));
  const screenOffsetById = new Map(project.screens.map((screen) => [
    screen.id,
    { x: screen.canvasX, y: screen.canvasY },
  ]));
  const virtualTailApplied = usesNovaLctVirtualTail(model);

  return controller.portRuns.map((run) => {
    const cabinets = run.cabinetIds
      .map((cabinetId) => cabinetById.get(cabinetId))
      .filter((cabinet): cabinet is CabinetInstance => cabinet !== undefined);
    const load = calculateCabinetGroupPixelLoad(
      cabinets,
      modelById,
      virtualTailApplied,
      screenOffsetById,
    );
    return {
      run,
      pixels: load.actualPixels,
      loadingPixels: load.loadingPixels,
      virtualPixels: load.virtualPixels,
      loadingWidthPixels: load.widthPixels,
      loadingHeightPixels: load.heightPixels,
      virtualTailApplied,
      capacityPixels: capacity.portCapacityPixels,
      utilizationPercent:
        capacity.portCapacityPixels === 0 ? 0 : (load.loadingPixels / capacity.portCapacityPixels) * 100,
      valid: load.loadingPixels <= capacity.portCapacityPixels,
    };
  });
}

export function usesNovaLctVirtualTail(model: ControllerModel): boolean {
  return model.family === "MCTRL" || model.family === "VX";
}

export function calculateCabinetGroupPixelLoad(
  cabinets: CabinetInstance[],
  modelById: Map<string, CabinetModel>,
  includeVirtualTail: boolean,
  screenOffsetById?: Map<string, { x: number; y: number }>,
): PixelLoad {
  let actualPixels = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const cabinet of cabinets) {
    const cabinetModel = modelById.get(cabinet.modelId);
    if (!cabinetModel) continue;
    const size = cabinetPixelSize(cabinet, cabinetModel);
    const offset = screenOffsetById?.get(cabinet.screenId) ?? { x: 0, y: 0 };
    const x = offset.x + cabinet.pixelX;
    const y = offset.y + cabinet.pixelY;
    actualPixels += cabinetPixelCount(cabinetModel);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + size.width);
    maxY = Math.max(maxY, y + size.height);
  }

  if (!Number.isFinite(minX)) {
    return { actualPixels: 0, loadingPixels: 0, virtualPixels: 0, widthPixels: 0, heightPixels: 0 };
  }
  const widthPixels = Math.max(0, Math.ceil(maxX - minX));
  const heightPixels = Math.max(0, Math.ceil(maxY - minY));
  const boundingPixels = widthPixels * heightPixels;
  const loadingPixels = includeVirtualTail ? Math.max(actualPixels, boundingPixels) : actualPixels;
  return {
    actualPixels,
    loadingPixels,
    virtualPixels: Math.max(0, loadingPixels - actualPixels),
    widthPixels,
    heightPixels,
  };
}
