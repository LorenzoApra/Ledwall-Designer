import { CABLING_PATTERNS, orderCabinetsByPattern } from "../domain/cablingPatterns";
import type { CabinetInstance, CablingPattern } from "../domain/types";

const previewCabinets = Array.from({ length: 9 }, (_, index) => ({
  id: String(index), pixelX: index % 3, pixelY: Math.floor(index / 3),
})) as CabinetInstance[];

export function CablingPatternPicker({ value, onChange }: {
  value: CablingPattern;
  onChange: (value: CablingPattern) => void;
}) {
  return (
    <div className="cabling-patterns" role="group" aria-label="Pattern di cablaggio">
      {CABLING_PATTERNS.map((pattern) => {
        const points = orderCabinetsByPattern(previewCabinets, pattern.id)
          .map((cabinet) => ({ x: 8 + cabinet.pixelX * 14, y: 8 + cabinet.pixelY * 14 }));
        const marker = `pattern-arrow-${pattern.id}`;
        return (
          <button key={pattern.id} type="button" className={`pattern-button ${value === pattern.id ? "selected" : ""}`}
            aria-pressed={value === pattern.id} aria-label={pattern.label} title={pattern.label}
            onClick={() => onChange(pattern.id)}>
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <defs><marker id={marker} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor" /></marker></defs>
              <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              {[1, 4, 7].map((index) => <line key={index} x1={points[index - 1].x} y1={points[index - 1].y} x2={points[index].x} y2={points[index].y} stroke="currentColor" strokeWidth="2" markerEnd={`url(#${marker})`} />)}
              <circle cx={points[0].x} cy={points[0].y} r="4" fill="#f3ad31" stroke="#59330a" strokeWidth="1" />
            </svg>
          </button>
        );
      })}
      <span className="pattern-description">{CABLING_PATTERNS.find((item) => item.id === value)?.label}</span>
    </div>
  );
}
