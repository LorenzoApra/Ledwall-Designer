import { createId } from "./id";
import { portColor } from "./wiring";
import type {
  AppLibraries,
  CabinetInstance,
  ElectricalSettings,
  LedwallProject,
  PowerLine,
  PowerLineMetrics,
} from "./types";

export function createAutomaticPowerLines(
  cabinets: CabinetInstance[],
  libraries: AppLibraries,
  settings: ElectricalSettings,
): PowerLine[] {
  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const ordered = [...cabinets].sort(
    (a, b) => a.screenId.localeCompare(b.screenId) || a.row - b.row || a.column - b.column,
  );
  const lineLimitW = settings.voltageV * settings.breakerA * (settings.utilizationPercent / 100);
  const lines: PowerLine[] = [];
  let current: PowerLine | undefined;
  let currentW = 0;

  for (const cabinet of ordered) {
    const model = modelById.get(cabinet.modelId);
    if (!model) continue;
    if (!current || (current.cabinetIds.length > 0 && currentW + model.powerMaxW > lineLimitW)) {
      current = {
        id: createId("power-line"),
        lineNumber: lines.length + 1,
        cabinetIds: [],
        color: portColor(lines.length),
      };
      lines.push(current);
      currentW = 0;
    }
    current.cabinetIds.push(cabinet.id);
    currentW += model.powerMaxW;
  }

  return lines;
}

export function calculatePowerLineMetrics(
  project: LedwallProject,
  libraries: AppLibraries,
): PowerLineMetrics[] {
  const cabinetById = new Map(project.cabinets.map((cabinet) => [cabinet.id, cabinet]));
  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const limitW =
    project.electrical.voltageV *
    project.electrical.breakerA *
    (project.electrical.utilizationPercent / 100);

  return project.powerLines.map((line) => {
    const totals = line.cabinetIds.reduce(
      (sum, cabinetId) => {
        const cabinet = cabinetById.get(cabinetId);
        const model = cabinet ? modelById.get(cabinet.modelId) : undefined;
        if (model) {
          sum.maxW += model.powerMaxW;
          sum.averageW += model.powerAverageW;
          sum.minW += model.powerMinW;
        }
        return sum;
      },
      { maxW: 0, averageW: 0, minW: 0 },
    );
    return {
      line,
      ...totals,
      maxA: totals.maxW / project.electrical.voltageV,
      averageA: totals.averageW / project.electrical.voltageV,
      utilizationPercent: limitW === 0 ? 0 : (totals.maxW / limitW) * 100,
      valid: totals.maxW <= limitW,
    };
  });
}

