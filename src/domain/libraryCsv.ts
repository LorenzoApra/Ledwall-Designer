import type {
  AccessoryModel,
  AppLibraries,
  BitDepth,
  CabinetModel,
  ControllerModel,
  FlybarMode,
  FlybarModel,
} from "./types";

export interface LibraryCsvResult {
  libraries: AppLibraries;
  counts: {
    cabinets: number;
    controllers: number;
    flybars: number;
    accessories: number;
  };
}

export function parseLibraryCsv(csv: string, base: AppLibraries): LibraryCsvResult {
  const rows = parseRows(csv);
  const header = rows.shift()?.map((cell) => cell.trim().toLowerCase());
  if (!header?.length) throw new Error("Il CSV della libreria è vuoto.");
  const records = rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]?.trim() ?? ""])));

  const cabinets: CabinetModel[] = [];
  const controllers: ControllerModel[] = [];
  const flybars: FlybarModel[] = [];
  const accessories: AccessoryModel[] = [];

  for (const record of records) {
    const type = record.type?.toLowerCase();
    if (!record.id || !record.name) continue;
    if (type === "cabinet") {
      cabinets.push({
        id: record.id,
        manufacturer: record.manufacturer || "Da definire",
        name: record.name,
        widthMm: numberValue(record.width_mm),
        heightMm: numberValue(record.height_mm),
        depthMm: numberValue(record.depth_mm),
        pixelWidth: numberValue(record.pixel_width),
        pixelHeight: numberValue(record.pixel_height),
        pitchMm: numberValue(record.pitch_mm),
        weightKg: numberValue(record.weight_kg),
        powerMaxW: numberValue(record.power_max_w),
        powerAverageW: numberValue(record.power_average_w),
        receivingCard: optional(record.receiving_card),
        notes: optional(record.notes),
        sourceLabel: optional(record.source_label),
      });
    } else if (type === "sending_card" || type === "controller") {
      const family = (["MCTRL", "VX", "MX/COEX", "Taurus"] as const).includes(record.family as ControllerModel["family"])
        ? record.family as ControllerModel["family"]
        : "MCTRL";
      controllers.push({
        id: record.id,
        manufacturer: "NovaStar",
        family,
        name: record.name,
        ethernetPorts: numberValue(record.ethernet_ports),
        totalCapacityPixels: numberValue(record.total_capacity_pixels),
        maxWidthPixels: numberValue(record.max_width_pixels),
        maxHeightPixels: numberValue(record.max_height_pixels),
        bandwidthPixelsPerSecond8Bit: numberValue(record.bandwidth_8bit_pps),
        bandwidthPixelsPerSecondHighBit: numberValue(record.bandwidth_highbit_pps),
        capabilities: {
          hdr: booleanValue(record.hdr),
          threeD: booleanValue(record.three_d),
          lowLatency: booleanValue(record.low_latency),
          portBackup: booleanValue(record.port_backup, true),
          controllerBackup: booleanValue(record.controller_backup, true),
          bitDepths: listNumbers(record.bit_depths).filter((value): value is BitDepth => value === 8 || value === 10 || value === 12),
          frameRates: listNumbers(record.frame_rates),
        },
        sourceUrl: record.source_url ?? "",
        notes: optional(record.notes),
      });
    } else if (type === "flybar") {
      const supportedModes = (record.supported_modes || "hanging")
        .split("|")
        .map((value) => value.trim())
        .filter((value): value is FlybarMode => value === "hanging" || value === "ground");
      flybars.push({
        id: record.id,
        manufacturer: record.manufacturer || "Da definire",
        name: record.name,
        widthMm: numberValue(record.width_mm),
        weightKg: numberValue(record.weight_kg),
        maxLoadKg: numberValue(record.max_load_kg),
        supportedModes: supportedModes.length ? supportedModes : ["hanging"],
        notes: optional(record.notes),
        sourceLabel: optional(record.source_label),
      });
    } else if (type === "accessory") {
      const category = (["connector", "plate", "rigging", "other"] as const).includes(record.category as AccessoryModel["category"])
        ? record.category as AccessoryModel["category"]
        : "other";
      accessories.push({
        id: record.id,
        manufacturer: record.manufacturer || "Da definire",
        name: record.name,
        category,
        weightKg: numberValue(record.weight_kg),
        notes: optional(record.notes),
        sourceLabel: optional(record.source_label),
      });
    }
  }

  const counts = {
    cabinets: cabinets.length,
    controllers: controllers.length,
    flybars: flybars.length,
    accessories: accessories.length,
  };
  if (Object.values(counts).every((count) => count === 0)) {
    throw new Error("Il CSV non contiene righe valide. Usa type: cabinet, sending_card, flybar o accessory.");
  }
  return {
    libraries: {
      cabinets: cabinets.length ? uniqueById(cabinets) : structuredClone(base.cabinets),
      controllers: controllers.length ? uniqueById(controllers) : structuredClone(base.controllers),
      flybars: flybars.length ? uniqueById(flybars) : structuredClone(base.flybars),
      accessories: accessories.length ? uniqueById(accessories) : structuredClone(base.accessories),
    },
    counts,
  };
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ";" && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim()) && !row[0]?.trim().startsWith("#")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim()) && !row[0]?.trim().startsWith("#")) rows.push(row);
  return rows;
}

function numberValue(value?: string): number {
  const parsed = Number((value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function booleanValue(value?: string, fallback = false): boolean {
  if (!value) return fallback;
  return ["1", "true", "si", "sì", "yes"].includes(value.toLowerCase());
}

function listNumbers(value?: string): number[] {
  return (value ?? "").split("|").map(numberValue).filter((entry) => entry > 0);
}

function optional(value?: string): string | undefined {
  return value || undefined;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
