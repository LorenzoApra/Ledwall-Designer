import type { AppLibraries, CabinetModel, ControllerModel } from "../domain/types";

export const DEFAULT_CABINETS: CabinetModel[] = [
  {
    id: "yestech-mg7s-39-outdoor",
    manufacturer: "Yestech",
    name: "MG7S 3.9 Outdoor",
    widthMm: 500,
    heightMm: 500,
    depthMm: 73,
    pixelWidth: 128,
    pixelHeight: 128,
    pitchMm: 3.9,
    weightKg: 7.4,
    powerMaxW: 210,
    powerAverageW: 150,
    powerMinW: 70,
    moduleWidthMm: 250,
    moduleHeightMm: 250,
    modulePixelWidth: 64,
    modulePixelHeight: 64,
    scan: "1/11",
    receivingCard: "Nova A8s-N",
    specificationReceivingCard: "Nova A5S+",
    ipRating: "IP65",
    notes:
      "Receiving card operativa da RCFGX: A8s-N. La scheda tecnica riporta A5S+.",
    sourceLabel: "Yestech MG7S 3,9 Outdoor - scheda fornita dall'utente",
  },
];

const commonFrameRates = [24, 25, 30, 48, 50, 60, 100, 120];

function capabilities(
  partial: Partial<ControllerModel["capabilities"]> = {},
): ControllerModel["capabilities"] {
  return {
    hdr: false,
    threeD: false,
    lowLatency: false,
    portBackup: true,
    controllerBackup: true,
    bitDepths: [8, 10, 12],
    frameRates: commonFrameRates,
    ...partial,
  };
}

const LEGACY_1G_8BIT_PPS = 39_000_000;
const LEGACY_1G_HIGH_BIT_PPS = 19_200_000;
const COEX_1G_8BIT_PPS = 39_583_350;
const COEX_1G_HIGH_BIT_PPS = 19_791_650;

export const DEFAULT_CONTROLLERS: ControllerModel[] = [
  {
    id: "novastar-mctrl4k",
    manufacturer: "NovaStar",
    family: "MCTRL",
    name: "MCTRL4K",
    ethernetPorts: 16,
    totalCapacityPixels: 8_800_000,
    maxWidthPixels: 7680,
    maxHeightPixels: 7680,
    bandwidthPixelsPerSecond8Bit: LEGACY_1G_8BIT_PPS,
    bandwidthPixelsPerSecondHighBit: LEGACY_1G_HIGH_BIT_PPS,
    capabilities: capabilities({ hdr: true, threeD: true, lowLatency: true }),
    sourceUrl:
      "https://www.novastar.tech/wp-content/uploads/2019/09/MCTRL4K-LED-Display-Controller-User-Manual-V1.1.0.pdf",
    notes: "16 porte 1G; 650.000 px/porta a 8 bit e 320.000 a 10/12 bit a 60 Hz.",
  },
  {
    id: "novastar-vx1000",
    manufacturer: "NovaStar",
    family: "VX",
    name: "VX1000",
    ethernetPorts: 10,
    totalCapacityPixels: 6_500_000,
    maxWidthPixels: 10_240,
    maxHeightPixels: 8192,
    bandwidthPixelsPerSecond8Bit: LEGACY_1G_8BIT_PPS,
    bandwidthPixelsPerSecondHighBit: LEGACY_1G_HIGH_BIT_PPS,
    capabilities: capabilities({ hdr: true, lowLatency: true }),
    sourceUrl: "https://www.novastar.tech/product/detail.html?catid=3&id=35",
  },
  {
    id: "novastar-mctrl660-pro",
    manufacturer: "NovaStar",
    family: "MCTRL",
    name: "MCTRL660 PRO",
    ethernetPorts: 6,
    totalCapacityPixels: 2_300_000,
    maxWidthPixels: 3840,
    maxHeightPixels: 2560,
    bandwidthPixelsPerSecond8Bit: LEGACY_1G_8BIT_PPS,
    bandwidthPixelsPerSecondHighBit: LEGACY_1G_HIGH_BIT_PPS,
    capabilities: capabilities({ lowLatency: true }),
    sourceUrl:
      "https://www.novastar.tech/wp-content/uploads/2019/06/MCTRL660-PRO-Independent-Controller-Specifications-V1.3.0.pdf",
  },
  {
    id: "novastar-mctrl300",
    manufacturer: "NovaStar",
    family: "MCTRL",
    name: "MCTRL300",
    ethernetPorts: 2,
    totalCapacityPixels: 1_300_000,
    maxWidthPixels: 3840,
    maxHeightPixels: 3840,
    bandwidthPixelsPerSecond8Bit: LEGACY_1G_8BIT_PPS,
    bandwidthPixelsPerSecondHighBit: LEGACY_1G_HIGH_BIT_PPS,
    capabilities: capabilities({ bitDepths: [8], frameRates: [50, 60] }),
    sourceUrl: "https://www.novastar.tech/product/detail.html?catid=2&id=30",
  },
  {
    id: "novastar-mx30",
    manufacturer: "NovaStar",
    family: "MX/COEX",
    name: "MX30",
    ethernetPorts: 10,
    totalCapacityPixels: 6_500_000,
    maxWidthPixels: 16_384,
    maxHeightPixels: 8192,
    bandwidthPixelsPerSecond8Bit: COEX_1G_8BIT_PPS,
    bandwidthPixelsPerSecondHighBit: COEX_1G_HIGH_BIT_PPS,
    capabilities: capabilities({ hdr: true, threeD: true, lowLatency: true }),
    sourceUrl: "https://www.novastar.tech/product/detail.html?catid=2&id=49",
    notes: "Controller COEX 1G; capacita totale dichiarata 6,5 milioni di pixel.",
  },
  {
    id: "novastar-tb8",
    manufacturer: "NovaStar",
    family: "Taurus",
    name: "Taurus TB8",
    ethernetPorts: 4,
    totalCapacityPixels: 2_300_000,
    maxWidthPixels: 4096,
    maxHeightPixels: 1920,
    bandwidthPixelsPerSecond8Bit: LEGACY_1G_8BIT_PPS,
    bandwidthPixelsPerSecondHighBit: LEGACY_1G_HIGH_BIT_PPS,
    capabilities: capabilities({ bitDepths: [8], frameRates: [50, 60] }),
    sourceUrl:
      "https://oss.novastar.tech/uploads/2022/03/Taurus-Series-Multimedia-Player-TB8-Specifications-V1.6.6.pdf",
  },
  {
    id: "novastar-tb60",
    manufacturer: "NovaStar",
    family: "Taurus",
    name: "Taurus TB60",
    ethernetPorts: 4,
    totalCapacityPixels: 2_300_000,
    maxWidthPixels: 4096,
    maxHeightPixels: 4096,
    bandwidthPixelsPerSecond8Bit: LEGACY_1G_8BIT_PPS,
    bandwidthPixelsPerSecondHighBit: LEGACY_1G_HIGH_BIT_PPS,
    capabilities: capabilities({ bitDepths: [8], frameRates: [50, 60] }),
    sourceUrl:
      "https://oss.novastar.tech/uploads/2024/11/TB60-Multimedia-Player-Specifications-V1.2.1.pdf",
  },
];

export const DEFAULT_LIBRARIES: AppLibraries = {
  cabinets: DEFAULT_CABINETS,
  controllers: DEFAULT_CONTROLLERS,
};

