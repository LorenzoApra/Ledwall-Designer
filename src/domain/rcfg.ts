import { unzipSync } from "fflate";

export interface RcfgCabinetData {
  fileName: string;
  pixelWidth: number;
  pixelHeight: number;
  modulePixelWidth?: number;
  modulePixelHeight?: number;
  scan?: string;
  receivingCard?: string;
}

export function parseRcfgFile(fileName: string, bytes: Uint8Array): RcfgCabinetData {
  let xmlBytes = bytes;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const entries = unzipSync(bytes);
    const xmlEntry = Object.entries(entries).find(([name]) => name.toLowerCase().endsWith(".xml"));
    if (!xmlEntry) throw new Error("Il pacchetto RCFGX non contiene un file XML leggibile.");
    xmlBytes = xmlEntry[1];
  }
  return parseRcfgXml(fileName, new TextDecoder().decode(xmlBytes));
}

export function parseRcfgXml(fileName: string, xml: string): RcfgCabinetData {
  if (!/<ScanBoardProperty[\s>]/i.test(xml)) {
    throw new Error("Il file RCFG/RCFGX non contiene XML NovaStar valido.");
  }
  // Nei file NovaStar i primi Width/Height appartengono alla ScanBoardProperty;
  // eventuali valori omonimi di CabinetInfo compaiono più avanti e non sono
  // dati fisici affidabili.
  const pixelWidth = optionalNumber(tagText(xml, "Width"));
  const pixelHeight = optionalNumber(tagText(xml, "Height"));
  if (!pixelWidth || !pixelHeight) {
    throw new Error("Risoluzione cabinet Width/Height non trovata nel file NovaStar.");
  }
  const moduleXml = blockText(xml, "StandardLedModuleProp");
  const versionXml = blockText(xml, "ConfigFileVersion");
  const rawScan = tagText(moduleXml, "ScanType");
  return {
    fileName,
    pixelWidth,
    pixelHeight,
    modulePixelWidth: optionalNumber(tagText(moduleXml, "ModulePixelCols")),
    modulePixelHeight: optionalNumber(tagText(moduleXml, "ModulePixelRows")),
    scan: rawScan ? normalizeScan(rawScan) : undefined,
    receivingCard: tagText(versionXml, "ScanBoardName") || undefined,
  };
}

function tagText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function blockText(xml: string, tag: string): string {
  return tagText(xml, tag);
}

function optionalNumber(value?: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeScan(value: string): string {
  const match = value.match(/(?:Scan[_-]?)?(\d+)/i);
  return match ? `1/${Number(match[1])}` : value;
}
