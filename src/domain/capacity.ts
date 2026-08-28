import type {
  AppLibraries,
  CapacityResult,
  ControllerInstance,
  ControllerModel,
  LedwallProject,
  PortMetrics,
} from "./types";
import { cabinetPixelCount } from "./geometry";

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

  return controller.portRuns.map((run) => {
    const pixels = run.cabinetIds.reduce((total, cabinetId) => {
      const cabinet = cabinetById.get(cabinetId);
      const cabinetModel = cabinet ? modelById.get(cabinet.modelId) : undefined;
      return total + (cabinetModel ? cabinetPixelCount(cabinetModel) : 0);
    }, 0);
    return {
      run,
      pixels,
      capacityPixels: capacity.portCapacityPixels,
      utilizationPercent:
        capacity.portCapacityPixels === 0 ? 0 : (pixels / capacity.portCapacityPixels) * 100,
      valid: pixels <= capacity.portCapacityPixels,
    };
  });
}
