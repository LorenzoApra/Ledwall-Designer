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
  const ordered = cabinets.filter((cabinet) => !cabinet.excludeFromPixelmap).sort(
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

export interface UndoPowerLineResult {
  lines: PowerLine[];
  removedCabinetId?: string;
  nextCabinetId?: string;
}

export function removeCabinetFromPowerLines(
  lines: PowerLine[],
  cabinetId: string,
): PowerLine[] {
  return lines
    .map((line) => ({
      ...line,
      cabinetIds: line.cabinetIds.filter((id) => id !== cabinetId),
    }))
    .filter((line) => line.cabinetIds.length > 0);
}

export function appendCabinetToPowerLine(
  lines: PowerLine[],
  lineNumber: number,
  cabinetId: string,
): PowerLine[] {
  const target = lines.find((line) => line.lineNumber === lineNumber);
  if (target?.cabinetIds.includes(cabinetId)) return lines;

  const cleaned = removeCabinetFromPowerLines(lines, cabinetId);
  const existing = cleaned.find((line) => line.lineNumber === lineNumber);
  const next = existing
    ? cleaned.map((line) =>
        line.id === existing.id
          ? { ...line, cabinetIds: [...line.cabinetIds, cabinetId] }
          : line,
      )
    : [
        ...cleaned,
        {
          id: createId("power-line"),
          lineNumber,
          cabinetIds: [cabinetId],
          color: portColor(lineNumber - 1),
        },
      ];
  return next.sort((a, b) => a.lineNumber - b.lineNumber);
}

export function undoLastCabinetFromPowerLine(
  lines: PowerLine[],
  lineNumber: number,
): UndoPowerLineResult {
  const target = lines.find((line) => line.lineNumber === lineNumber);
  const removedCabinetId = target?.cabinetIds.at(-1);
  if (!target || !removedCabinetId) return { lines };

  const nextIds = target.cabinetIds.slice(0, -1);
  const next = lines
    .map((line) =>
      line.id === target.id ? { ...line, cabinetIds: nextIds } : line,
    )
    .filter((line) => line.cabinetIds.length > 0);
  return {
    lines: next,
    removedCabinetId,
    nextCabinetId: nextIds.at(-1),
  };
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
