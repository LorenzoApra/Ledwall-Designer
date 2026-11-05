import {
  calculateCabinetGroupPixelLoad,
  calculateControllerCapacity,
  usesNovaLctVirtualTail,
} from "./capacity";
import { cabinetPixelCount, distanceBetweenCabinets } from "./geometry";
import { createId } from "./id";
import { CABLING_PATTERNS, orderCabinetsByPattern } from "./cablingPatterns";
import type {
  AppLibraries,
  CabinetInstance,
  CablingPattern,
  ControllerInstance,
  LedScreen,
  PortRun,
} from "./types";

const PORT_COLORS = [
  "#39d6d2",
  "#da7ce8",
  "#71d16d",
  "#788ee8",
  "#efe731",
  "#ff8b5e",
  "#67aef7",
  "#e85a83",
  "#9bd76e",
  "#ba8df4",
  "#f4b95f",
  "#52c7a5",
  "#ea7575",
  "#7ab4d8",
  "#d4d868",
  "#ad7ed7",
];

export interface AutoWiringResult {
  runs: PortRun[];
  warnings: string[];
  totalDistanceMm: number;
}

export interface UndoPortRunResult {
  runs: PortRun[];
  removedCabinetId?: string;
  nextCabinetId?: string;
}

interface Candidate {
  ordered: CabinetInstance[];
  label: string;
}

export function createAutoWiring(
  screen: LedScreen,
  cabinets: CabinetInstance[],
  controller: ControllerInstance,
  libraries: AppLibraries,
  pattern: CablingPattern = screen.dataPattern ?? "columns-tl",
): AutoWiringResult {
  const warnings: string[] = [];
  const controllerModel = libraries.controllers.find((model) => model.id === controller.modelId);
  if (!controllerModel) {
    return { runs: [], warnings: ["Modello controller non trovato."], totalDistanceMm: 0 };
  }

  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const screenCabinets = cabinets.filter(
    (cabinet) => cabinet.screenId === screen.id && !cabinet.excludeFromPixelmap,
  );
  if (screenCabinets.length === 0) {
    return { runs: [], warnings: ["Lo schermo non contiene cabinet."], totalDistanceMm: 0 };
  }

  const capacity = calculateControllerCapacity(controllerModel, controller);
  warnings.push(...capacity.warnings);

  const totalPixels = screenCabinets.reduce((total, cabinet) => {
    const model = modelById.get(cabinet.modelId);
    return total + (model ? cabinetPixelCount(model) : 0);
  }, 0);

  if (totalPixels > capacity.totalCapacityPixels) {
    warnings.push(
      `Carico totale ${formatNumber(totalPixels)} px superiore alla capacita del controller (${formatNumber(capacity.totalCapacityPixels)} px).`,
    );
  }

  const includeVirtualTail = usesNovaLctVirtualTail(controllerModel);
  const best = evaluateCandidate({
    ordered: orderCabinetsByPattern(screenCabinets, pattern),
    label: CABLING_PATTERNS.find((item) => item.id === pattern)?.label ?? pattern,
  }, capacity.portCapacityPixels, modelById, includeVirtualTail);
  if (!best) {
    return {
      runs: [],
      warnings: [...warnings, "Almeno un cabinet supera da solo la capacita di una porta."],
      totalDistanceMm: 0,
    };
  }

  if (best.groups.length > controllerModel.ethernetPorts) {
    warnings.push(
      `Servono ${best.groups.length} porte ma ${controllerModel.name} ne dispone di ${controllerModel.ethernetPorts}.`,
    );
  }

  const totalLoadingPixels = best.groups.reduce(
    (total, group) => total + calculateCabinetGroupPixelLoad(
      group,
      modelById,
      includeVirtualTail,
    ).loadingPixels,
    0,
  );
  if (totalLoadingPixels > capacity.totalCapacityPixels) {
    warnings.push(
      `Carico totale NovaLCT ${formatNumber(totalLoadingPixels)} px superiore alla capacità del controller (${formatNumber(capacity.totalCapacityPixels)} px).`,
    );
  }
  if (includeVirtualTail) {
    const virtualPixels = totalLoadingPixels - totalPixels;
    if (virtualPixels > 0) {
      warnings.push(
        `Serie ${controllerModel.family}: incluse ${formatNumber(virtualPixels)} tail virtuali dovute agli spazi vuoti nei rettangoli delle porte.`,
      );
    }
  }

  let runs = best.groups.map((group, index) => ({
    id: createId("port-run"),
    portNumber: index + 1,
    cabinetIds: group.map((cabinet) => cabinet.id),
    color: PORT_COLORS[index % PORT_COLORS.length],
  }));

  if (controller.mode.redundancy) {
    runs = assignAutomaticBackupPorts(
      runs,
      controllerModel.ethernetPorts,
      `Secondo ${controllerModel.name}`,
    );
  }
  warnings.push(`Percorso scelto: ${best.label}.`);
  return { runs, warnings, totalDistanceMm: best.distanceMm };
}

export function removeCabinetFromPortRuns(
  runs: PortRun[],
  cabinetId: string,
): PortRun[] {
  return runs
    .map((run) => ({
      ...run,
      cabinetIds: run.cabinetIds.filter((id) => id !== cabinetId),
    }))
    .filter((run) => run.cabinetIds.length > 0);
}

/** Replace only the chosen screens, reserving other main and backup ports. */
export function mergeAutomaticPortRuns(
  existing: PortRun[],
  targetCabinetIds: Set<string>,
  generated: PortRun[],
  totalPorts: number,
  redundancy: boolean,
  backupControllerLabel: string,
): { runs: PortRun[]; error?: string } {
  const retained = existing.map((run) => ({ ...run, cabinetIds: run.cabinetIds.filter((id) => !targetCabinetIds.has(id)) }))
    .filter((run) => run.cabinetIds.length > 0);
  const reserved = new Set(retained.flatMap((run) =>
    redundancy && run.backupPortNumber !== undefined ? [run.portNumber, run.backupPortNumber] : [run.portNumber],
  ));
  const available = Array.from({ length: totalPorts }, (_, index) => index + 1).filter((port) => !reserved.has(port));
  if (generated.length > available.length) {
    return { runs: existing, error: `Servono ${generated.length} porte libere, disponibili ${available.length}.` };
  }
  const newRuns: PortRun[] = generated.map((run, index) => ({
    ...run, portNumber: available[index], color: portColor(available[index] - 1),
    backupPortNumber: undefined, backupControllerName: undefined,
  }));
  if (redundancy) {
    const backups = available.slice(newRuns.length).reverse();
    newRuns.forEach((run, index) => {
      run.backupPortNumber = backups[index];
      run.backupControllerName = `${backupControllerLabel}: porta ${run.portNumber}`;
    });
  }
  return { runs: [...retained, ...newRuns].sort((a, b) => a.portNumber - b.portNumber) };
}

export function appendCabinetToPortRun(
  runs: PortRun[],
  portNumber: number,
  cabinetId: string,
): PortRun[] {
  const target = runs.find((run) => run.portNumber === portNumber);
  if (target?.cabinetIds.includes(cabinetId)) return runs;

  const cleaned = removeCabinetFromPortRuns(runs, cabinetId);
  const existing = cleaned.find((run) => run.portNumber === portNumber);
  const next = existing
    ? cleaned.map((run) =>
        run.id === existing.id
          ? { ...run, cabinetIds: [...run.cabinetIds, cabinetId] }
          : run,
      )
    : [
        ...cleaned,
        {
          id: createId("port-run"),
          portNumber,
          cabinetIds: [cabinetId],
          color: portColor(portNumber - 1),
        },
      ];
  return next.sort((a, b) => a.portNumber - b.portNumber);
}

export function undoLastCabinetFromPortRun(
  runs: PortRun[],
  portNumber: number,
): UndoPortRunResult {
  const target = runs.find((run) => run.portNumber === portNumber);
  const removedCabinetId = target?.cabinetIds.at(-1);
  if (!target || !removedCabinetId) return { runs };

  const nextIds = target.cabinetIds.slice(0, -1);
  const next = runs
    .map((run) =>
      run.id === target.id ? { ...run, cabinetIds: nextIds } : run,
    )
    .filter((run) => run.cabinetIds.length > 0);
  return {
    runs: next,
    removedCabinetId,
    nextCabinetId: nextIds.at(-1),
  };
}

function evaluateCandidate(
  candidate: Candidate,
  capacityPixels: number,
  modelById: Map<string, AppLibraries["cabinets"][number]>,
  includeVirtualTail: boolean,
): { groups: CabinetInstance[][]; distanceMm: number; label: string } | null {
  const groups: CabinetInstance[][] = [];
  let current: CabinetInstance[] = [];

  for (const cabinet of candidate.ordered) {
    const model = modelById.get(cabinet.modelId);
    if (!model) continue;
    const pixels = cabinetPixelCount(model);
    if (pixels > capacityPixels) return null;
    const nextLoad = calculateCabinetGroupPixelLoad(
      [...current, cabinet],
      modelById,
      includeVirtualTail,
    ).loadingPixels;
    if (current.length > 0 && nextLoad > capacityPixels) {
      groups.push(current);
      current = [];
    }
    current.push(cabinet);
  }
  if (current.length > 0) groups.push(current);

  const distanceMm = groups.reduce((total, group) => {
    return (
      total +
      group.slice(1).reduce((subtotal, cabinet, index) => {
        return subtotal + distanceBetweenCabinets(group[index], cabinet, modelById);
      }, 0)
    );
  }, 0);
  return { groups, distanceMm, label: candidate.label };
}

export function assignAutomaticBackupPorts(
  runs: PortRun[],
  totalPorts: number,
  backupControllerLabel = "Secondo controller",
): PortRun[] {
  const used = new Set(runs.map((run) => run.portNumber));
  const available = Array.from({ length: totalPorts }, (_, index) => totalPorts - index).filter(
    (port) => !used.has(port),
  );
  return runs.map((run, index) => ({
    ...run,
    backupPortNumber: available[index],
    backupControllerName: `${backupControllerLabel}: porta ${run.portNumber}`,
  }));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("it-IT").format(value);
}

export function portColor(index: number): string {
  return PORT_COLORS[index % PORT_COLORS.length];
}
