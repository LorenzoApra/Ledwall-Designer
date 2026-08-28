import type { ReactNode } from "react";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="inspector-section">
      <div className="section-heading">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-row ${disabled ? "disabled" : ""}`}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? "on" : ""}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        <span />
      </button>
    </label>
  );
}

export function Metric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "good" | "warn" }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

