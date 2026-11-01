import React, { useEffect, useState } from "react";
import { Save, ShieldCheck, ArrowUpRight } from "lucide-react";
import { apiRequest, adminApi } from "../lib/api";
export function Settings() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [logs, setLogs] = useState<any[]>([]);
  const load = () => {
    Promise.all([apiRequest("/admin/settings"), adminApi.dashboard.auditLogs()])
      .then(([d, l]) => {
        setData(d);
        setLogs(l);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      setData(
        await apiRequest("/admin/settings", { method: "PUT", body: data }),
      );
      setNotice("Your storefront settings have been saved.");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="header">
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h1 className="page-title">Store settings</h1>
          <p className="page-subtitle">
            The small details that bring your storefront together.
          </p>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <button className="text-button" onClick={load}>
            Retry
          </button>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <div className="settings-layout">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Your storefront</h2>
              <p>These settings are shared with the mobile app.</p>
            </div>
          </div>
          {data ? (
            <form className="panel-body" onSubmit={save}>
              {[
                { key: "storeName", label: "Store name" },
                { key: "announcement", label: "Home page announcement" },
                {
                  key: "supportEmail",
                  label: "Customer support email",
                  type: "email",
                },
                {
                  key: "deliveryFee",
                  label: "Standard delivery fee (₹)",
                  type: "number",
                },
                {
                  key: "freeShippingThreshold",
                  label: "Free delivery from (₹)",
                  type: "number",
                },
                { key: "downloadUrl", label: "App download link", type: "url" },
              ].map((f) => (
                <div className="form-group" key={f.key}>
                  <label htmlFor={f.key} className="form-label">
                    {f.label}
                  </label>
                  <input
                    id={f.key}
                    className="form-input"
                    type={f.type || "text"}
                    min={f.type === "number" ? 0 : undefined}
                    required={f.key !== "downloadUrl"}
                    value={data[f.key]}
                    onChange={(e) =>
                      setData({
                        ...data,
                        [f.key]:
                          f.type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                  {f.key === "downloadUrl" && (
                    <small className="field-hint">
                      Use the URL of a published APK or app store listing. Leave
                      blank until a build is available.
                    </small>
                  )}
                </div>
              ))}
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 22,
                  marginTop: 8,
                }}
              >
                <h3 style={{ fontSize: 15, marginBottom: 18 }}>
                  Customer care & policies
                </h3>
                {[
                  { key: "returnsHeadline", label: "Returns headline" },
                  { key: "returnsPolicy", label: "Return and exchange policy" },
                  {
                    key: "shippingPolicy",
                    label: "Delivery and shipping policy",
                  },
                  { key: "privacyPolicy", label: "Privacy information" },
                  { key: "termsOfService", label: "Terms and conditions" },
                  { key: "aboutStore", label: "About your store" },
                ].map((field) => (
                  <div className="form-group" key={field.key}>
                    <label htmlFor={field.key} className="form-label">
                      {field.label}
                    </label>
                    <textarea
                      id={field.key}
                      className="form-textarea"
                      rows={field.key === "returnsHeadline" ? 1 : 4}
                      value={data[field.key] || ""}
                      required
                      onChange={(e) =>
                        setData({ ...data, [field.key]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
              <button disabled={busy} className="btn btn-primary">
                <Save size={15} />
                {busy ? "Saving…" : "Save settings"}
              </button>
            </form>
          ) : (
            <div className="empty-state">Loading settings…</div>
          )}
        </div>
        <div>
          <div className="editorial-card">
            <ShieldCheck size={26} color="var(--primary)" />
            <h2 style={{ marginTop: 15 }}>
              Your store.
              <br />
              Your access.
            </h2>
            <p>
              Admin operations are restricted to the configured owner email by
              the server. Account passwords are stored as bcrypt hashes.
            </p>
            <p style={{ marginTop: 15 }}>
              Change owner credentials with the documented provisioning command
              on your API server.
            </p>
          </div>
          <div className="panel">
            <div className="panel-heading">
              <h2>Builds & documentation</h2>
            </div>
            <div className="panel-body">
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  lineHeight: 1.8,
                }}
              >
                Setup, framework details and Android download instructions live
                with your source code.
              </p>
              <a
                className="btn btn-secondary"
                style={{ marginTop: 17 }}
                href="https://github.com/Rememberfrxst/N3EXPO"
                target="_blank"
                rel="noreferrer"
              >
                Open project <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 25 }}>
        <div className="panel-heading">
          <h2>Store activity</h2>
          <small>{logs.length} most recent actions</small>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Record</th>
                <th>Owner</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ textTransform: "capitalize" }}>
                    {l.action.toLowerCase().replaceAll("_", " ")}
                  </td>
                  <td>
                    <small>{l.targetEntity}</small>
                  </td>
                  <td>{l.adminName}</td>
                  <td>{new Date(l.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
