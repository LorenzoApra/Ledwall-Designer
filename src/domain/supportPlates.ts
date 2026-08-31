import { cabinetPhysicalSize } from "./geometry";
import { createId } from "./id";
import type {
  AppLibraries,
  CabinetInstance,
  LedScreen,
  SupportPlate,
  SupportPlateType,
} from "./types";

export interface SupportPlatePlan {
  plates: SupportPlate[];
  heightMm: number;
  required: boolean;
  warnings: string[];
}

export function createAutomaticSupportPlates(
  screen: LedScreen,
  cabinets: CabinetInstance[],
  libraries: AppLibraries,
  type: SupportPlateType,
  requirementHeightMm = 4000,
): SupportPlatePlan {
  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const items = cabinets
    .filter((cabinet) => cabinet.screenId === screen.id)
    .map((cabinet) => {
      const model = modelById.get(cabinet.modelId);
      if (!model) return undefined;
      const size = cabinetPhysicalSize(cabinet, model);
      return {
        cabinet,
        left: cabinet.physicalXmm,
        top: cabinet.physicalYmm,
        right: cabinet.physicalXmm + size.width,
        bottom: cabinet.physicalYmm + size.height,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  if (!items.length) {
    return {
      plates: [],
      heightMm: 0,
      required: false,
      warnings: ["Lo schermo non contiene cabinet."],
    };
  }

  const minY = Math.min(...items.map((item) => item.top));
  const maxY = Math.max(...items.map((item) => item.bottom));
  const heightMm = maxY - minY;
  const required = heightMm >= requirementHeightMm;
  if (!required) {
    return {
      plates: [],
      heightMm,
      required,
      warnings: [
        `Altezza ${(heightMm / 1000).toFixed(2)} m: piastre non obbligatorie secondo la soglia impostata di ${(requirementHeightMm / 1000).toFixed(2)} m.`,
      ],
    };
  }

  const tolerance = 0.5;
  const near = (a: number, b: number) => Math.abs(a - b) <= tolerance;
  const plates: SupportPlate[] = [];

  // Il manuale MG7S indica una sola fila di connecting pieces a 4 m dal
  // bordo inferiore. In precedenza veniva marcato ogni giunto 2x2 dello
  // schermo, producendo decine di piastre non pertinenti.
  const targetY = maxY - requirementHeightMm;
  if (near(targetY, minY)) {
    const topRow = items
      .filter((item) => near(item.top, minY))
      .sort((a, b) => a.left - b.left);
    for (const left of topRow) {
      const right = topRow.find((item) => near(item.left, left.right));
      if (!right) continue;
      plates.push({
        id: createId("support-plate"),
        type,
        xMm: left.right,
        yMm: minY,
        cabinetIds: [left.cabinet.id, right.cabinet.id],
        automatic: true,
      });
    }
  } else {
    const upperItems = items.filter((item) => near(item.bottom, targetY));
    const lowerItems = items.filter((item) => near(item.top, targetY));
    for (const upperLeft of upperItems) {
      const upperRight = upperItems.find((item) => near(item.left, upperLeft.right));
      const lowerLeft = lowerItems.find((item) => near(item.left, upperLeft.left));
      const lowerRight = lowerItems.find((item) => near(item.left, upperLeft.right));
      if (!upperRight || !lowerLeft || !lowerRight) continue;
      plates.push({
        id: createId("support-plate"),
        type,
        xMm: upperLeft.right,
        yMm: targetY,
        cabinetIds: [
          upperLeft.cabinet.id,
          upperRight.cabinet.id,
          lowerLeft.cabinet.id,
          lowerRight.cabinet.id,
        ],
        automatic: true,
      });
    }
  }

  const warnings = [
    `Altezza ${(heightMm / 1000).toFixed(2)} m: generate ${plates.length} piastre sulla fila a ${(requirementHeightMm / 1000).toFixed(2)} m dal bordo inferiore.`,
  ];
  if (heightMm > 12_000) {
    warnings.push(
      "Altezza superiore a 12 m: il manuale richiede di rinforzare la struttura sospesa o consultare il supporto tecnico.",
    );
  }
  return { plates, heightMm, required, warnings };
}

export function supportPlateWeightKg(
  plate: SupportPlate,
  simplePlateWeightKg: number,
  aliscafPlateWeightKg: number,
): number {
  return plate.type === "aliscaf" ? aliscafPlateWeightKg : simplePlateWeightKg;
}
