interface SliderFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  minLabel?: string;
  maxLabel?: string;
  onChange: (value: number) => void;
}

/**
 * A slider paired with a number input.
 *
 * The number input matters: a slider alone cannot express "our recruiter earns
 * exactly 11,40,000", and a prospect who cannot enter their real figure stops
 * believing the output.
 */
export function SliderField({
  id, label, hint, value, min, max, step, display, minLabel, maxLabel, onChange,
}: SliderFieldProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className="field">
      <div className="field__head">
        <label className="field__label" htmlFor={id}>{label}</label>
        <div className="field__display tnum">{display}</div>
      </div>
      {hint ? <p className="field__hint">{hint}</p> : null}

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
      />

      <div className="field__foot">
        <span>{minLabel ?? min.toLocaleString('en-US')}</span>
        <label className="field__exact">
          <span className="visually-hidden">{label}, exact value</span>
          <input
            type="number"
            className="field__number tnum"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(clamp(n));
            }}
          />
        </label>
        <span>{maxLabel ?? max.toLocaleString('en-US')}</span>
      </div>
    </div>
  );
}
