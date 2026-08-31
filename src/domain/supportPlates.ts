import { cabinetPhysicalSize, cabinetPixelSize } from "./geometry";
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
      const physicalSize = cabinetPhysicalSize(cabinet, model);
      const pixelSize = cabinetPixelSize(cabinet, model);
      return {
        cabinet,
        physicalLeft: cabinet.physicalXmm,
        physicalTop: cabinet.physicalYmm,
        physicalWidth: physicalSize.width,
        physicalHeight: physicalSize.height,
        pixelLeft: cabinet.pixelX,
        pixelTop: cabinet.pixelY,
        pixelRight: cabinet.pixelX + pixelSize.width,
        pixelBottom: cabinet.pixelY + pixelSize.height,
        pixelWidth: pixelSize.width,
        pixelHeight: pixelSize.height,
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

  const minPixelX = Math.min(...items.map((item) => item.pixelLeft));
  const minPixelY = Math.min(...items.map((item) => item.pixelTop));
  const minPhysicalX = Math.min(...items.map((item) => item.physicalLeft));
  const minPhysicalY = Math.min(...items.map((item) => item.physicalTop));
  const heightMm = Math.max(...items.map((item) =>
    (item.pixelBottom - minPixelY) * (item.physicalHeight / item.pixelHeight),
  ));
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

  // The visible canvas grid is authoritative for adjacency. Physical
  // coordinates can drift after pixel-based moves (128 px × pitch 3.9 is
  // 499.2 mm while the nominal cabinet is 500 mm), so using millimetres to
  // find neighbours produced the sparse pattern seen in real projects.
  const pixelTolerance = 0.5;
  const nearPixel = (a: number, b: number) => Math.abs(a - b) <= pixelTolerance;
  const plates: SupportPlate[] = [];

  // Nei primi `requirementHeightMm` dal bordo superiore va inserita una
  // connecting plate in ogni giunto interno formato da quattro cabinet.
  // Per una matrice MG7S larga 12 cabinet e alta almeno 9, con soglia 4 m,
  // sono quindi 8 file di giunti × 11 colonne = 88 piastre.
  for (const upperLeft of items) {
    const jointPixelY = upperLeft.pixelBottom;
    const jointDistanceMm = (jointPixelY - minPixelY) *
      (upperLeft.physicalHeight / upperLeft.pixelHeight);
    if (jointDistanceMm <= 0 || jointDistanceMm > requirementHeightMm + 0.5) continue;

    const upperRight = items.find((item) =>
      nearPixel(item.pixelLeft, upperLeft.pixelRight) &&
      nearPixel(item.pixelTop, upperLeft.pixelTop) &&
      nearPixel(item.pixelBottom, upperLeft.pixelBottom),
    );
    const lowerLeft = items.find((item) =>
      nearPixel(item.pixelLeft, upperLeft.pixelLeft) && nearPixel(item.pixelTop, jointPixelY),
    );
    const lowerRight = lowerLeft
      ? items.find((item) =>
          nearPixel(item.pixelLeft, upperLeft.pixelRight) &&
          nearPixel(item.pixelTop, lowerLeft.pixelTop) &&
          nearPixel(item.pixelBottom, lowerLeft.pixelBottom),
        )
      : undefined;
    if (!upperRight || !lowerLeft || !lowerRight) continue;

    const mmPerPixelX = upperLeft.physicalWidth / upperLeft.pixelWidth;
    const mmPerPixelY = upperLeft.physicalHeight / upperLeft.pixelHeight;

    plates.push({
      id: createId("support-plate"),
      type,
      xMm: minPhysicalX + (upperLeft.pixelRight - minPixelX) * mmPerPixelX,
      yMm: minPhysicalY + (jointPixelY - minPixelY) * mmPerPixelY,
      cabinetIds: [
        upperLeft.cabinet.id,
        upperRight.cabinet.id,
        lowerLeft.cabinet.id,
        lowerRight.cabinet.id,
      ],
      automatic: true,
    });
  }

  const warnings = [
    `Altezza ${(heightMm / 1000).toFixed(2)} m: generate ${plates.length} piastre sui giunti interni nei primi ${(requirementHeightMm / 1000).toFixed(2)} m dal bordo superiore.`,
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
