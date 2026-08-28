import { useCallback, useState } from "react";
import type { LedwallProject } from "../domain/types";

interface HistoryState {
  past: LedwallProject[];
  present: LedwallProject;
  future: LedwallProject[];
}

export function useHistoryProject(initialProject: LedwallProject) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialProject,
    future: [],
  });

  const commit = useCallback((update: (project: LedwallProject) => LedwallProject) => {
    setHistory((current) => {
      const next = update(current.present);
      if (next === current.present) return current;
      return {
        past: [...current.past.slice(-49), current.present],
        present: { ...next, updatedAt: new Date().toISOString() },
        future: [],
      };
    });
  }, []);

  const replace = useCallback((project: LedwallProject) => {
    setHistory({ past: [], present: project, future: [] });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  return {
    project: history.present,
    commit,
    replace,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}

