import { useCallback, useState } from "react";
import { DEFAULT_LIBRARIES } from "../data/defaultLibraries";
import bundledLibraryCsv from "../data/ledwall-library.csv?raw";
import { parseLibraryCsv } from "../domain/libraryCsv";
import type { AppLibraries } from "../domain/types";

const STORAGE_KEY = "ledwall-designer:libraries:v1";
const BUNDLED_LIBRARIES = parseLibraryCsv(bundledLibraryCsv, DEFAULT_LIBRARIES).libraries;

export function mergeBundledLibraryAdditions(
  bundled: AppLibraries,
  stored: AppLibraries,
): AppLibraries {
  return {
    cabinets: mergeById(bundled.cabinets, stored.cabinets),
    controllers: mergeById(bundled.controllers, stored.controllers),
    flybars: mergeById(bundled.flybars, stored.flybars),
    accessories: mergeById(bundled.accessories, stored.accessories),
  };
}

function readLibraries(): AppLibraries {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(BUNDLED_LIBRARIES);
    const parsed = JSON.parse(stored) as AppLibraries;
    if (!Array.isArray(parsed.cabinets) || !Array.isArray(parsed.controllers)) {
      return structuredClone(BUNDLED_LIBRARIES);
    }
    return mergeBundledLibraryAdditions(BUNDLED_LIBRARIES, {
      ...parsed,
      flybars: Array.isArray(parsed.flybars) ? parsed.flybars : structuredClone(BUNDLED_LIBRARIES.flybars),
      accessories: Array.isArray(parsed.accessories) ? parsed.accessories : structuredClone(BUNDLED_LIBRARIES.accessories),
    });
  } catch {
    return structuredClone(BUNDLED_LIBRARIES);
  }
}

function mergeById<T extends { id: string }>(bundled: T[], stored: T[]): T[] {
  const storedIds = new Set(stored.map((item) => item.id));
  return [...stored, ...bundled.filter((item) => !storedIds.has(item.id))];
}

export function useLibraries() {
  const [libraries, setLibrariesState] = useState<AppLibraries>(readLibraries);

  const setLibraries = useCallback((next: AppLibraries) => {
    setLibrariesState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetLibraries = useCallback(() => {
    const defaults = structuredClone(BUNDLED_LIBRARIES);
    setLibrariesState(defaults);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  }, []);

  return { libraries, setLibraries, resetLibraries };
}
