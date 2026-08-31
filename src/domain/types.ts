export type Rotation = 0 | 90 | 180 | 270;
export type BitDepth = 8 | 10 | 12;
export type ViewMode = "design" | "data" | "power" | "pixelmap" | "weight";

export interface CabinetModel {
  id: string;
  manufacturer: string;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  pixelWidth: number;
  pixelHeight: number;
  pitchMm: number;
  weightKg: number;
  powerMaxW: number;
  powerAverageW: number;
  powerMinW: number;
  moduleWidthMm?: number;
  moduleHeightMm?: number;
  modulePixelWidth?: number;
  modulePixelHeight?: number;
  scan?: string;
  receivingCard?: string;
  specificationReceivingCard?: string;
  ipRating?: string;
  notes?: string;
  sourceLabel?: string;
}

export interface ControllerCapabilities {
  hdr: boolean;
  threeD: boolean;
  lowLatency: boolean;
  portBackup: boolean;
  controllerBackup: boolean;
  bitDepths: BitDepth[];
  frameRates: number[];
}

export interface ControllerModel {
  id: string;
  manufacturer: "NovaStar";
  family: "MCTRL" | "VX" | "MX/COEX" | "Taurus";
  name: string;
  ethernetPorts: number;
  totalCapacityPixels: number;
  maxWidthPixels: number;
  maxHeightPixels: number;
  bandwidthPixelsPerSecond8Bit: number;
  bandwidthPixelsPerSecondHighBit: number;
  capabilities: ControllerCapabilities;
  sourceUrl: string;
  notes?: string;
}

export interface ControllerMode {
  frameRate: number;
  bitDepth: BitDepth;
  hdr: boolean;
  threeD: boolean;
  lowLatency: boolean;
  redundancy: boolean;
  safetyMarginPercent: number;
}

export interface PortRun {
  id: string;
  portNumber: number;
  cabinetIds: string[];
  color: string;
  backupPortNumber?: number;
  backupControllerName?: string;
}

export interface ControllerInstance {
  id: string;
  modelId: string;
  name: string;
  mode: ControllerMode;
  portRuns: PortRun[];
}

export interface CabinetInstance {
  id: string;
  screenId: string;
  modelId: string;
  row: number;
  column: number;
  pixelX: number;
  pixelY: number;
  physicalXmm: number;
  physicalYmm: number;
  rotation: Rotation;
  excludeFromPixelmap?: boolean;
}

export interface PixelmapOptions {
  showGrid: boolean;
  showCoordinates: boolean;
  showCircles: boolean;
  showDiagonals: boolean;
  showColorBars: boolean;
  showGrayscale: boolean;
  showScreenName: boolean;
  showResolution: boolean;
  showLogo: boolean;
}

export interface SuspensionPoint {
  id: string;
  label: string;
  xMm: number;
  cabinetIds: string[];
}

export type SupportPlateType = "simple" | "aliscaf";

export interface SupportPlate {
  id: string;
  type: SupportPlateType;
  xMm: number;
  yMm: number;
  cabinetIds: string[];
  automatic: boolean;
}

export type FlybarMode = "hanging" | "ground";

export interface FlybarModel {
  id: string;
  manufacturer: string;
  name: string;
  widthMm: number;
  weightKg: number;
  maxLoadKg: number;
  supportedModes: FlybarMode[];
  notes?: string;
  sourceLabel?: string;
}

export interface AccessoryModel {
  id: string;
  manufacturer: string;
  name: string;
  category: "connector" | "plate" | "rigging" | "other";
  weightKg: number;
  notes?: string;
  sourceLabel?: string;
}

export interface FlybarInstance {
  id: string;
  modelId: string;
  label: string;
  mode: FlybarMode;
  xMm: number;
  yMm: number;
  cabinetIds: string[];
}

export interface LedScreen {
  id: string;
  name: string;
  canvasX: number;
  canvasY: number;
  cabinetIds: string[];
  pixelmap: PixelmapOptions;
  suspensionPoints: SuspensionPoint[];
  supportPlates: SupportPlate[];
  flybars: FlybarInstance[];
}

export interface PowerLine {
  id: string;
  lineNumber: number;
  cabinetIds: string[];
  color: string;
}

export interface ElectricalSettings {
  voltageV: number;
  breakerA: number;
  utilizationPercent: number;
}

export interface RiggingSettings {
  cableKgPerCabinet: number;
  accessoryKgPerCabinet: number;
  hangingBarKgPerPoint: number;
  simplePlateWeightKg: number;
  aliscafPlateWeightKg: number;
  plateRequirementHeightMm: number;
}

export interface ProjectMetadata {
  projectName: string;
  company: string;
  client: string;
  event: string;
  location: string;
  author: string;
  date: string;
  revision: string;
  logoDataUrl?: string;
}

export interface LedwallProject {
  schemaVersion: 1;
  id: string;
  metadata: ProjectMetadata;
  canvasWidth: number;
  canvasHeight: number;
  screens: LedScreen[];
  cabinets: CabinetInstance[];
  controllers: ControllerInstance[];
  powerLines: PowerLine[];
  electrical: ElectricalSettings;
  rigging: RiggingSettings;
  updatedAt: string;
}

export interface AppLibraries {
  cabinets: CabinetModel[];
  controllers: ControllerModel[];
  flybars: FlybarModel[];
  accessories: AccessoryModel[];
}

export interface CapacityResult {
  portCapacityPixels: number;
  totalCapacityPixels: number;
  warnings: string[];
}

export interface PortMetrics {
  run: PortRun;
  pixels: number;
  capacityPixels: number;
  utilizationPercent: number;
  valid: boolean;
}

export interface PowerLineMetrics {
  line: PowerLine;
  maxW: number;
  averageW: number;
  minW: number;
  maxA: number;
  averageA: number;
  utilizationPercent: number;
  valid: boolean;
}

export interface SuspensionPointMetrics {
  point: SuspensionPoint;
  cabinetWeightKg: number;
  estimatedAccessoryWeightKg: number;
  totalWeightKg: number;
}

export interface FlybarMetrics {
  flybar: FlybarInstance;
  model?: FlybarModel;
  cabinetWeightKg: number;
  cableAndAccessoryWeightKg: number;
  plateWeightKg: number;
  supportedLoadKg: number;
  flybarWeightKg: number;
  utilizationPercent: number;
  valid: boolean;
}
