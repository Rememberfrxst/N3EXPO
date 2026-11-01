import React from "react";
import { Plus, X } from "lucide-react";
export function SpecificationFields({
  value,
  onChange,
  disabled,
}: {
  value: [string, string][];
  onChange: (v: [string, string][]) => void;
  disabled: boolean;
}) {
  const update = (i: number, column: number, text: string) =>
    onChange(
      value.map((entry, index) =>
        index === i
          ? (entry.map((part, c) => (c === column ? text : part)) as [
              string,
              string,
            ])
          : entry,
      ),
    );
  return (
    <div role="group" aria-label="Specifications">
      {value.map(([name, detail], i) => (
        <div className="specification-fields" key={i}>
          <input
            aria-label={`Detail name ${i + 1}`}
            placeholder="e.g. Material"
            className="form-input"
            value={name}
            disabled={disabled}
            onChange={(e) => update(i, 0, e.target.value)}
          />
          <input
            aria-label={`Detail value ${i + 1}`}
            placeholder="e.g. Organic cotton"
            className="form-input"
            value={detail}
            disabled={disabled}
            onChange={(e) => update(i, 1, e.target.value)}
          />
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove detail ${i + 1}`}
            disabled={disabled}
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            <X size={17} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondary"
        disabled={disabled}
        onClick={() => onChange([...value, ["", ""]])}
      >
        <Plus size={14} />
        Add a detail
      </button>
    </div>
  );
}
