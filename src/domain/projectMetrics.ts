import { calculatePortMetrics } from "./capacity";
import { calculatePowerLineMetrics } from "./electrical";
import { calculateEstimatedProjectWeightKg } from "./weight";
import type { AppLibraries, LedwallProject } from "./types";

export function calculateProjectTotals(project: LedwallProject, libraries: AppLibraries) {
  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const cabinetTotals = project.cabinets.reduce(
    (totals, cabinet) => {
      const model = modelById.get(cabinet.modelId);
      if (!model) return totals;
      totals.pixels += model.pixelWidth * model.pixelHeight;
      totals.maxW += model.powerMaxW;
      totals.averageW += model.powerAverageW;
      totals.cabinetWeightKg += model.weightKg;
      return totals;
    },
    { pixels: 0, maxW: 0, averageW: 0, cabinetWeightKg: 0 },
  );
  return {
    cabinetCount: project.cabinets.length,
    screenCount: project.screens.length,
    ...cabinetTotals,
    totalEstimatedWeightKg: calculateEstimatedProjectWeightKg(project, libraries),
    ports: project.controllers.flatMap((controller) =>
      calculatePortMetrics(project, libraries, controller),
    ),
    powerLines: calculatePowerLineMetrics(project, libraries),
  };
}
