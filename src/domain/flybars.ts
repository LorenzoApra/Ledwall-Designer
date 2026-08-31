import { supportPlateWeightKg } from "./supportPlates";
import type { AppLibraries, FlybarMetrics, LedwallProject } from "./types";

export function calculateFlybarMetrics(
  project: LedwallProject,
  libraries: AppLibraries,
): FlybarMetrics[] {
  const cabinetById = new Map(project.cabinets.map((cabinet) => [cabinet.id, cabinet]));
  const cabinetModelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const flybarModelById = new Map(libraries.flybars.map((model) => [model.id, model]));

  return project.screens.flatMap((screen) =>
    screen.flybars.map((flybar) => {
      const model = flybarModelById.get(flybar.modelId);
      const cabinetWeightKg = flybar.cabinetIds.reduce((total, cabinetId) => {
        const cabinet = cabinetById.get(cabinetId);
        return total + (cabinet ? cabinetModelById.get(cabinet.modelId)?.weightKg ?? 0 : 0);
      }, 0);
      const cableAndAccessoryWeightKg = flybar.cabinetIds.length *
        (project.rigging.cableKgPerCabinet + project.rigging.accessoryKgPerCabinet);
      const plateWeightKg = screen.supportPlates.reduce((total, plate) => {
        const affectedFlybars = screen.flybars.filter((candidate) =>
          candidate.cabinetIds.some((id) => plate.cabinetIds.includes(id)),
        );
        if (!affectedFlybars.some((candidate) => candidate.id === flybar.id) || !affectedFlybars.length) {
          return total;
        }
        return total + supportPlateWeightKg(
          plate,
          project.rigging.simplePlateWeightKg,
          project.rigging.aliscafPlateWeightKg,
        ) / affectedFlybars.length;
      }, 0);
      const supportedLoadKg = cabinetWeightKg + cableAndAccessoryWeightKg + plateWeightKg;
      const flybarWeightKg = model?.weightKg ?? 0;
      const utilizationPercent = model?.maxLoadKg
        ? (supportedLoadKg / model.maxLoadKg) * 100
        : 0;
      return {
        flybar,
        model,
        cabinetWeightKg,
        cableAndAccessoryWeightKg,
        plateWeightKg,
        supportedLoadKg,
        flybarWeightKg,
        utilizationPercent,
        valid: Boolean(model && model.maxLoadKg > 0 && supportedLoadKg <= model.maxLoadKg),
      };
    }),
  );
}

export function calculateFlybarOwnWeightKg(
  project: LedwallProject,
  libraries: AppLibraries,
): number {
  const modelById = new Map(libraries.flybars.map((model) => [model.id, model]));
  return project.screens.reduce(
    (total, screen) => total + screen.flybars.reduce(
      (screenTotal, flybar) => screenTotal + (modelById.get(flybar.modelId)?.weightKg ?? 0),
      0,
    ),
    0,
  );
}
