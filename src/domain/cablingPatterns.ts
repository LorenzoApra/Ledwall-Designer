import type { CabinetInstance, CablingPattern } from "./types";

export const CABLING_PATTERNS: {
  id: CablingPattern;
  label: string;
  axis: "row" | "column";
  fromRight: boolean;
  fromBottom: boolean;
}[] = [
  { id: "rows-tl", label: "Righe · alto sinistra", axis: "row", fromRight: false, fromBottom: false },
  { id: "columns-tl", label: "Colonne · alto sinistra", axis: "column", fromRight: false, fromBottom: false },
  { id: "rows-tr", label: "Righe · alto destra", axis: "row", fromRight: true, fromBottom: false },
  { id: "columns-tr", label: "Colonne · alto destra", axis: "column", fromRight: true, fromBottom: false },
  { id: "rows-bl", label: "Righe · basso sinistra", axis: "row", fromRight: false, fromBottom: true },
  { id: "columns-bl", label: "Colonne · basso sinistra", axis: "column", fromRight: false, fromBottom: true },
  { id: "rows-br", label: "Righe · basso destra", axis: "row", fromRight: true, fromBottom: true },
  { id: "columns-br", label: "Colonne · basso destra", axis: "column", fromRight: true, fromBottom: true },
];

/** Order by drawn position, so manually moved cabinets follow the visible layout. */
export function orderCabinetsByPattern(
  cabinets: CabinetInstance[],
  patternId: CablingPattern,
): CabinetInstance[] {
  const pattern = CABLING_PATTERNS.find((item) => item.id === patternId) ?? CABLING_PATTERNS[0];
  const primaryKey = pattern.axis === "row" ? "pixelY" : "pixelX";
  const secondaryKey = pattern.axis === "row" ? "pixelX" : "pixelY";
  const reversePrimary = pattern.axis === "row" ? pattern.fromBottom : pattern.fromRight;
  const reverseSecondary = pattern.axis === "row" ? pattern.fromRight : pattern.fromBottom;
  const groups = new Map<number, CabinetInstance[]>();
  for (const cabinet of cabinets) {
    const key = cabinet[primaryKey];
    const group = groups.get(key) ?? [];
    group.push(cabinet);
    groups.set(key, group);
  }
  const keys = [...groups.keys()].sort((a, b) => reversePrimary ? b - a : a - b);
  return keys.flatMap((key, index) => {
    const descending = reverseSecondary !== (index % 2 === 1);
    return [...groups.get(key)!].sort((a, b) =>
      (descending ? b[secondaryKey] - a[secondaryKey] : a[secondaryKey] - b[secondaryKey]) || a.id.localeCompare(b.id),
    );
  });
}
