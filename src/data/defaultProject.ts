import { createId } from "../domain/id";
import type { LedwallProject, PixelmapOptions } from "../domain/types";

export const DEFAULT_PIXELMAP_OPTIONS: PixelmapOptions = {
  showGrid: true,
  showCoordinates: true,
  showCircles: true,
  showDiagonals: true,
  showColorBars: true,
  showGrayscale: true,
  showScreenName: true,
  showResolution: true,
  showLogo: true,
};

export function createDefaultProject(): LedwallProject {
  const projectId = createId("project");
  const screenId = createId("screen");
  const controllerId = createId("controller");
  const today = new Date().toISOString().slice(0, 10);

  return {
    schemaVersion: 1,
    id: projectId,
    metadata: {
      projectName: "Nuovo progetto",
      company: "ATS Srl",
      client: "",
      event: "",
      location: "",
      author: "",
      date: today,
      revision: "01",
    },
    canvasWidth: 3840,
    canvasHeight: 2160,
    screens: [
      {
        id: screenId,
        name: "SCHERMO 1",
        canvasX: 0,
        canvasY: 0,
        cabinetIds: [],
        pixelmap: { ...DEFAULT_PIXELMAP_OPTIONS },
        suspensionPoints: [],
      },
    ],
    cabinets: [],
    controllers: [
      {
        id: controllerId,
        modelId: "novastar-mctrl4k",
        name: "MCTRL4K-1",
        mode: {
          frameRate: 50,
          bitDepth: 8,
          hdr: false,
          threeD: false,
          lowLatency: false,
          redundancy: true,
          safetyMarginPercent: 0,
        },
        portRuns: [],
      },
    ],
    powerLines: [],
    electrical: {
      voltageV: 230,
      breakerA: 16,
      utilizationPercent: 80,
    },
    rigging: {
      cableKgPerCabinet: 0.35,
      accessoryKgPerCabinet: 0.45,
      hangingBarKgPerPoint: 5,
    },
    updatedAt: new Date().toISOString(),
  };
}

