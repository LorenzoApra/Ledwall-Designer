import { useCallback, useState } from "react";
import { DEFAULT_LIBRARIES } from "../data/defaultLibraries";
import type { AppLibraries } from "../domain/types";

const STORAGE_KEY = "ledwall-designer:libraries:v1";

function readLibraries(): AppLibraries {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(DEFAULT_LIBRARIES);
    const parsed = JSON.parse(stored) as AppLibraries;
    if (!Array.isArray(parsed.cabinets) || !Array.isArray(parsed.controllers)) {
      return structuredClone(DEFAULT_LIBRARIES);
    }
    return {
      ...parsed,
      flybars: Array.isArray(parsed.flybars) ? parsed.flybars : structuredClone(DEFAULT_LIBRARIES.flybars),
      accessories: Array.isArray(parsed.accessories) ? parsed.accessories : structuredClone(DEFAULT_LIBRARIES.accessories),
    };
  } catch {
    return structuredClone(DEFAULT_LIBRARIES);
  }
}

export function useLibraries() {
  const [libraries, setLibrariesState] = useState<AppLibraries>(readLibraries);

  const setLibraries = useCallback((next: AppLibraries) => {
    setLibrariesState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetLibraries = useCallback(() => {
    const defaults = structuredClone(DEFAULT_LIBRARIES);
    setLibrariesState(defaults);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  }, []);

  return { libraries, setLibraries, resetLibraries };
}
