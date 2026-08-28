import { cabinetPhysicalCenter } from "./geometry";
import { createId } from "./id";
import type {
  AppLibraries,
  CabinetInstance,
  LedScreen,
  LedwallProject,
  SuspensionPoint,
  SuspensionPointMetrics,
} from "./types";

export function createAutomaticSuspensionPoints(
  screen: LedScreen,
  cabinets: CabinetInstance[],
  libraries: AppLibraries,
): SuspensionPoint[] {
  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const screenCabinets = cabinets.filter((cabinet) => cabinet.screenId === screen.id);
  const byColumn = new Map<number, CabinetInstance[]>();
  for (const cabinet of screenCabinets) {
    const group = byColumn.get(cabinet.column) ?? [];
    group.push(cabinet);
    byColumn.set(cabinet.column, group);
  }

  return [...byColumn.entries()]
    .sort(([a], [b]) => a - b)
    .map(([column, columnCabinets], index) => {
      const centers = columnCabinets
        .map((cabinet) => {
          const model = modelById.get(cabinet.modelId);
          return model ? cabinetPhysicalCenter(cabinet, model).x : undefined;
        })
        .filter((value): value is number => value !== undefined);
      return {
        id: createId("suspension"),
        label: `P${index + 1}`,
        xMm: centers.length ? centers.reduce((sum, value) => sum + value, 0) / centers.length : 0,
        cabinetIds: columnCabinets.map((cabinet) => cabinet.id),
      };
    });
}

export function calculateSuspensionMetrics(
  project: LedwallProject,
  libraries: AppLibraries,
): SuspensionPointMetrics[] {
  const cabinetById = new Map(project.cabinets.map((cabinet) => [cabinet.id, cabinet]));
  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  return project.screens.flatMap((screen) =>
    screen.suspensionPoints.map((point) => {
      const cabinetWeightKg = point.cabinetIds.reduce((total, cabinetId) => {
        const cabinet = cabinetById.get(cabinetId);
        const model = cabinet ? modelById.get(cabinet.modelId) : undefined;
        return total + (model?.weightKg ?? 0);
      }, 0);
      const estimatedAccessoryWeightKg =
        point.cabinetIds.length *
          (project.rigging.cableKgPerCabinet + project.rigging.accessoryKgPerCabinet) +
        project.rigging.hangingBarKgPerPoint;
      return {
        point,
        cabinetWeightKg,
        estimatedAccessoryWeightKg,
        totalWeightKg: cabinetWeightKg + estimatedAccessoryWeightKg,
      };
    }),
  );
}

export function calculateEstimatedProjectWeightKg(
  project: LedwallProject,
  libraries: AppLibraries,
): number {
  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const cabinetAndAccessoriesKg = project.cabinets.reduce((total, cabinet) => {
    const model = modelById.get(cabinet.modelId);
    if (!model) return total;
    return (
      total +
      model.weightKg +
      project.rigging.cableKgPerCabinet +
      project.rigging.accessoryKgPerCabinet
    );
  }, 0);
  const pointCount = project.screens.reduce(
    (total, screen) => total + screen.suspensionPoints.length,
    0,
  );
  return cabinetAndAccessoriesKg + pointCount * project.rigging.hangingBarKgPerPoint;
}
