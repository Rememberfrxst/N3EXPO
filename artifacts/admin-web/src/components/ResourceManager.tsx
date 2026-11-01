import { ProductOptions } from "./ProductOptions";
import { SpecificationFields } from "./SpecificationFields";
import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Archive,
  X,
  ArrowUpRight,
  Upload,
  Image as ImageIcon,
  Package,
} from "lucide-react";
import { apiRequest, adminApi } from "../lib/api";
export type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
};
type Props = {
  resource: string;
  title: string;
  description: string;
  singular: string;
  fields: Field[];
};
const money = (n: any) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
export function ResourceManager({
  resource,
  title,
  description,
  singular,
  fields,
}: Props) {
  const [rows, setRows] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [draft, setDraft] = useState<any>(null),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState(""),
    [cats, setCats] = useState<any[]>([]),
    [destinationProducts, setDestinationProducts] = useState<any[]>([]),
    [uploading, setUploading] = useState(false);
  const dialog = useRef<HTMLDivElement>(null),
    opener = useRef<HTMLElement | null>(null);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await apiRequest(`/admin/${resource}`));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    if (
      resource === "products" ||
      resource === "banners" ||
      resource === "categories"
    )
      adminApi.categories
        .list()
        .then(setCats)
        .catch((e) => setError(e.message));
    if (resource === "banners")
      adminApi.products
        .list()
        .then(setDestinationProducts)
        .catch((e) => setError(e.message));
  }, [resource]);
  useEffect(() => {
    if (!draft) return;
    opener.current = document.activeElement as HTMLElement;
    dialog.current?.querySelector<HTMLElement>("input,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) setDraft(null);
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select,textarea,a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener.current?.focus();
    };
  }, [!!draft, saving]);
  const edit = (row?: any) => {
    setError("");
    setNotice("");
    const d = {
      isActive: true,
      isFeatured: false,
      stock: 0,
      sortOrder: 0,
      discountType: "percentage",
      ...row,
    };
    for (const f of fields) {
      if (f.type === "images")
        d[f.key] = (row?.images || []).map((i: any) => i.url).join("\n");
      if (f.type === "specs") d[f.key] = Object.entries(row?.[f.key] || {});
      if (f.type === "variants") d[f.key] = row?.[f.key] || [];
      if (f.type === "datetime-local" && d[f.key]) {
        const dt = new Date(d[f.key]);
        d[f.key] = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      }
    }
    setDraft(d);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body: any = {};
      for (const f of fields) {
        const v = draft[f.key];
        if (f.type === "images")
          body[f.key] = (v || "")
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean);
        else if (f.type === "variants") body[f.key] = v || [];
        else if (f.type === "specs") {
          const details = (v || [])
            .map(([k, value]: [string, string]) => [k.trim(), value.trim()])
            .filter(([k, value]: [string, string]) => k || value);
          if (details.some(([k, value]: [string, string]) => !k || !value))
            throw new Error("Each product detail needs a name and a value.");
          if (
            new Set(details.map(([k]: [string, string]) => k.toLowerCase()))
              .size !== details.length
          )
            throw new Error("Use a different name for each product detail.");
          body[f.key] = Object.fromEntries(details);
        } else if (f.type === "number")
          body[f.key] = v === "" || v === undefined ? null : Number(v);
        else if (f.type === "datetime-local")
          body[f.key] = v ? new Date(v).toISOString() : null;
        else if (f.type === "checkbox") body[f.key] = !!v;
        else body[f.key] = v || null;
      }
      if (resource === "categories" && !body.slug)
        body.slug = String(body.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      await apiRequest(`/admin/${resource}${draft.id ? `/${draft.id}` : ""}`, {
        method: draft.id ? "PATCH" : "POST",
        body,
      });
      setNotice(
        `${singular} ${draft.id ? "updated" : "created"} successfully.`,
      );
      setDraft(null);
      await load();
    } catch (e: any) {
      setError(
        e instanceof SyntaxError
          ? "Could not read product details."
          : e.message,
      );
    } finally {
      setSaving(false);
    }
  };
  const archive = async (row: any) => {
    if (
      !confirm(
        `Archive “${row.name || row.title || row.code}”? It will no longer appear in the app.`,
      )
    )
      return;
    try {
      await apiRequest(`/admin/${resource}/${row.id}`, { method: "DELETE" });
      setNotice(`${singular} archived.`);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const upload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { uploads } = await adminApi.uploads.presign(
        [{ fileName: file.name, contentType: file.type, size: file.size }],
        resource,
      );
      await adminApi.uploads.putToS3(uploads[0].presignedUrl, file);
      setDraft((d: any) => ({
        ...d,
        [key]:
          key === "images"
            ? [d[key], uploads[0].publicUrl].filter(Boolean).join("\n")
            : uploads[0].publicUrl,
      }));
    } catch (e: any) {
      setError(
        `Upload unavailable: ${e.message}. You can also paste a hosted image URL.`,
      );
    } finally {
      setUploading(false);
    }
  };
  const visible = rows.filter(
    (r) =>
      (filter === "all" || (filter === "active" ? r.isActive : !r.isActive)) &&
      JSON.stringify([r.name, r.title, r.code, r.brand, r.sku])
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const status = (r: any) => {
    if (!r.isActive) return "Archived";
    const start = r.startsAt || r.validFrom,
      end = r.endsAt || r.validUntil;
    if (start && new Date(start) > new Date()) return "Scheduled";
    if (end && new Date(end) < new Date()) return "Ended";
    return "Active";
  };
  return (
    <div>
      <div className="header">
        <div>
          <p className="eyebrow">STORE / {title.toUpperCase()}</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{description}</p>
        </div>
        <button className="btn btn-primary" onClick={() => edit()}>
          <Plus size={17} /> Add {singular.toLowerCase()}
        </button>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {error && !draft && (
        <div className="error" role="alert">
          {error}{" "}
          <button className="text-button" onClick={load}>
            Try again
          </button>
        </div>
      )}
      <div className="card-table">
        <div className="resource-toolbar">
          <div className="tabs">
            {["all", "active", "archived"].map((f) => (
              <button
                key={f}
                className={filter === f ? "selected" : ""}
                onClick={() => setFilter(f)}
              >
                {f[0].toUpperCase() + f.slice(1)}
                {f === "all" && <span>{rows.length}</span>}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label={`Search ${title}`}
              placeholder={`Search ${title.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <div className="empty-state">Loading {title.toLowerCase()}…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <Package size={34} />
            <h3>
              {query
                ? "No matches found"
                : `Your ${title.toLowerCase()} start here`}
            </h3>
            <p>
              {query
                ? "Try another search."
                : `Add your first ${singular.toLowerCase()} to get started.`}
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{singular}</th>
                  {resource === "products" ? (
                    <>
                      <th>Price / offer</th>
                      <th>Inventory</th>
                    </>
                  ) : resource === "coupons" ? (
                    <>
                      <th>Discount</th>
                      <th>Redemptions</th>
                    </>
                  ) : (
                    <>
                      <th>Destination / slug</th>
                      <th>Display order</th>
                    </>
                  )}
                  <th>Status</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="product-cell">
                        {r.images?.[0]?.url || r.imageUrl ? (
                          <img src={r.images?.[0]?.url || r.imageUrl} alt="" />
                        ) : (
                          <div className="image-placeholder">
                            <ImageIcon size={19} />
                          </div>
                        )}
                        <div>
                          <strong>
                            {r.name || r.title || r.code || "Untitled campaign"}
                          </strong>
                          <small>
                            {r.sku ||
                              r.subtitle ||
                              (r.validUntil
                                ? `Until ${new Date(r.validUntil).toLocaleDateString()}`
                                : r.slug) ||
                              "—"}
                          </small>
                        </div>
                      </div>
                    </td>
                    {resource === "products" ? (
                      <>
                        <td>
                          <strong>{money(r.price)}</strong>
                          {Number(r.compareAtPrice) > Number(r.price) && (
                            <small className="old-price">
                              {money(r.compareAtPrice)}
                            </small>
                          )}
                          {r.isFeatured && <small>Featured pick</small>}
                        </td>
                        <td>
                          <span
                            className={`stock-dot ${r.stock <= 5 ? "low" : ""}`}
                          />
                          {r.stock} available
                        </td>
                      </>
                    ) : resource === "coupons" ? (
                      <>
                        <td>
                          {r.discountType === "percentage"
                            ? `${r.discountValue}%`
                            : money(r.discountValue)}{" "}
                          off<small>Min. {money(r.minOrderValue)}</small>
                        </td>
                        <td>
                          {r.usedCount || 0}
                          {r.usageLimit ? ` / ${r.usageLimit}` : " used"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          {r.linkType
                            ? `${r.linkType}: ${r.linkValue}`
                            : r.slug || "Explore categories"}
                          {r.startsAt && (
                            <small>
                              Starts {new Date(r.startsAt).toLocaleDateString()}
                            </small>
                          )}
                        </td>
                        <td>{r.sortOrder || 0}</td>
                      </>
                    )}
                    <td>
                      <span
                        className={`badge ${status(r) === "Active" ? "badge-success" : status(r) === "Scheduled" ? "badge-warning" : "badge-neutral"}`}
                      >
                        {status(r)}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          aria-label={`Edit ${r.name || r.title || r.code}`}
                          title="Edit"
                          onClick={() => edit(r)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          aria-label={`Archive ${r.name || r.title || r.code}`}
                          title="Archive"
                          onClick={() => archive(r)}
                        >
                          <Archive size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          {visible.length} {singular.toLowerCase()}
          {visible.length === 1 ? "" : "s"} · Changes are reflected in the app
          when refreshed.
        </div>
      </div>
      {draft && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setDraft(null);
          }}
        >
          <div
            ref={dialog}
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">
                  {draft.id ? "EDIT" : "NEW"} {singular.toUpperCase()}
                </p>
                <h2 id="editor-title">
                  {draft.id
                    ? "Make it just right."
                    : `Add a ${singular.toLowerCase()}.`}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close editor"
                disabled={saving}
                onClick={() => setDraft(null)}
              >
                <X size={21} />
              </button>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <form onSubmit={save}>
              <div className="editor-grid">
                {fields.map((f) => (
                  <div
                    key={f.key}
                    className={`form-group ${["textarea", "images", "specs", "variants"].includes(f.type || "") ? "wide" : ""}`}
                  >
                    <label className="form-label" htmlFor={`field-${f.key}`}>
                      {f.label}
                      {f.required && <span> *</span>}
                    </label>
                    {f.type === "variants" ? (
                      <ProductOptions
                        value={draft[f.key] || []}
                        onChange={(value) =>
                          setDraft({ ...draft, [f.key]: value })
                        }
                        disabled={saving}
                      />
                    ) : f.type === "specs" ? (
                      <SpecificationFields
                        value={draft[f.key] || []}
                        onChange={(value) =>
                          setDraft({ ...draft, [f.key]: value })
                        }
                        disabled={saving}
                      />
                    ) : f.key === "linkValue" &&
                      ["category", "product"].includes(draft.linkType) ? (
                      <select
                        id={`field-${f.key}`}
                        className="form-select"
                        required
                        value={draft[f.key] || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, [f.key]: e.target.value })
                        }
                      >
                        <option value="">Choose a {draft.linkType}…</option>
                        {(draft.linkType === "category"
                          ? cats.map((cat) => ({
                              value: cat.slug,
                              label: cat.name,
                            }))
                          : destinationProducts.map((product) => ({
                              value: product.id,
                              label: product.name,
                            }))
                        ).map((option) => (
                          <option value={option.value} key={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "checkbox" ? (
                      <label className="toggle-row">
                        <input
                          id={`field-${f.key}`}
                          type="checkbox"
                          checked={!!draft[f.key]}
                          onChange={(e) =>
                            setDraft({ ...draft, [f.key]: e.target.checked })
                          }
                        />
                        <span>{f.hint || "Enabled"}</span>
                      </label>
                    ) : f.type === "select" ||
                      ["categoryId", "parentId"].includes(f.key) ? (
                      <select
                        id={`field-${f.key}`}
                        className="form-select"
                        value={draft[f.key] || ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [f.key]: e.target.value,
                            ...(f.key === "linkType" ? { linkValue: "" } : {}),
                          })
                        }
                        required={f.required}
                      >
                        <option value="">Select…</option>
                        {(["categoryId", "parentId"].includes(f.key)
                          ? cats
                              .filter(
                                (cat) =>
                                  f.key !== "parentId" || cat.id !== draft.id,
                              )
                              .map((cat) => ({
                                value: cat.id,
                                label: cat.name,
                              }))
                          : f.options || []
                        ).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : ["textarea", "images", "specs", "variants"].includes(
                        f.type || "",
                      ) ? (
                      <textarea
                        id={`field-${f.key}`}
                        className="form-textarea"
                        rows={f.type === "images" ? 3 : 4}
                        value={draft[f.key] || ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [f.key]: e.target.value,
                            ...(f.key === "linkType" ? { linkValue: "" } : {}),
                          })
                        }
                        required={f.required}
                      />
                    ) : (
                      <input
                        id={`field-${f.key}`}
                        className="form-input"
                        type={f.type || "text"}
                        min={f.type === "number" ? 0 : undefined}
                        step={f.type === "number" ? "any" : undefined}
                        required={f.required}
                        value={draft[f.key] ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [f.key]: e.target.value,
                            ...(f.key === "linkType" ? { linkValue: "" } : {}),
                          })
                        }
                      />
                    )}{" "}
                    {f.hint && f.type !== "checkbox" && (
                      <small className="field-hint">{f.hint}</small>
                    )}
                    {["images", "imageUrl"].includes(f.key) && (
                      <label className="upload-button">
                        <Upload size={14} />
                        {uploading ? "Uploading…" : "Upload an image"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploading}
                          onChange={(e) => upload(e, f.key)}
                          hidden
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || uploading}
                >
                  {saving ? "Saving…" : "Save changes"}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
