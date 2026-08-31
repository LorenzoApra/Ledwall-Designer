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

  for (const topLeft of items) {
    const topRight = items.find(
      (item) => near(item.left, topLeft.right) && near(item.top, topLeft.top),
    );
    const bottomLeft = items.find(
      (item) => near(item.left, topLeft.left) && near(item.top, topLeft.bottom),
    );
    const bottomRight = items.find(
      (item) =>
        near(item.left, topLeft.right) && near(item.top, topLeft.bottom),
    );
    if (!topRight || !bottomLeft || !bottomRight) continue;
    plates.push({
      id: createId("support-plate"),
      type,
      xMm: topLeft.right,
      yMm: topLeft.bottom,
      cabinetIds: [
        topLeft.cabinet.id,
        topRight.cabinet.id,
        bottomLeft.cabinet.id,
        bottomRight.cabinet.id,
      ],
      automatic: true,
    });
  }

  const warnings = [
    `Altezza ${(heightMm / 1000).toFixed(2)} m: generate ${plates.length} piastre ai giunti interni tra quattro cabinet.`,
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
