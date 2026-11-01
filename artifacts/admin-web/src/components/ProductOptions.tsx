import React from "react";
import { Plus, X, Archive } from "lucide-react";
interface Option {
  id?: string;
  name: string;
  value: string;
  stock: number | string;
  priceModifier: number | string;
  sku?: string | null;
}
export function ProductOptions({
  value,
  onChange,
  disabled,
}: {
  value: Option[];
  onChange: (v: Option[]) => void;
  disabled: boolean;
}) {
  const update = (index: number, key: string, text: string) =>
    onChange(value.map((v, i) => (i === index ? { ...v, [key]: text } : v)));
  return (
    <div aria-label="Product options" role="group">
      {value.map((option, i) => (
        <div key={option.id || i} className="product-option">
          <div className="editor-grid">
            {[
              {
                key: "name",
                label: "Option type",
                hint: "Size, color, storage…",
              },
              {
                key: "value",
                label: "Option value",
                hint: "M, black, 128 GB…",
              },
              { key: "stock", label: "Option stock", type: "number" },
              {
                key: "priceModifier",
                label: "Price adjustment (₹)",
                type: "number",
              },
            ].map((field) => (
              <label key={field.key}>
                <small>{field.label}</small>
                <input
                  aria-label={`${field.label} ${i + 1}`}
                  className="form-input"
                  disabled={disabled}
                  type={field.type || "text"}
                  min={field.key === "stock" ? 0 : undefined}
                  step={field.key === "stock" ? 1 : "any"}
                  value={option[field.key as keyof Option] ?? ""}
                  placeholder={field.hint}
                  onChange={(e) => update(i, field.key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() =>
              option.id
                ? onChange(
                    value.map((v, n) => (n === i ? { ...v, stock: 0 } : v)),
                  )
                : onChange(value.filter((_, n) => n !== i))
            }
          >
            {option.id ? (
              <>
                <Archive size={13} /> Set unavailable
              </>
            ) : (
              <>
                <X size={13} /> Remove option
              </>
            )}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondary"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...value,
            { name: "Size", value: "", stock: 0, priceModifier: 0 },
          ])
        }
      >
        <Plus size={14} />
        Add an option
      </button>
      <small className="field-hint">
        Each option has its own stock. Set stock to zero to make an existing
        option unavailable while preserving past orders.
      </small>
    </div>
  );
}
