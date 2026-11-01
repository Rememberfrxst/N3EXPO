import React, { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { adminApi } from "../lib/api";
export function Customers() {
  const [rows, setRows] = useState<any[]>([]),
    [q, setQ] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    adminApi.customers
      .list()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  const update = async (u: any, data: any) => {
    try {
      await adminApi.customers.update(u.id, data);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const list = rows.filter((r) =>
    `${r.name} ${r.email}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div>
      <div className="header">
        <div>
          <p className="eyebrow">THE PEOPLE BEHIND THE ORDERS</p>
          <h1 className="page-title">Your community</h1>
          <p className="page-subtitle">
            Manage customer accounts, seller access and verification.
          </p>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="card-table">
        <div className="resource-toolbar">
          <strong>{list.length} accounts</strong>
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label="Search customers"
              placeholder="Search name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <div className="empty-state">Loading your community…</div>
        ) : !list.length ? (
          <div className="empty-state">
            <Users size={30} />
            <p>No matching accounts.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Access</th>
                  <th>Verification</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <small>{u.email}</small>
                    </td>
                    <td>{u.phone || "—"}</td>
                    <td>
                      {u.role === "admin" ? (
                        <span className="badge badge-primary">
                          Owner account
                        </span>
                      ) : (
                        <select
                          aria-label={`Role for ${u.name}`}
                          className="form-select"
                          value={u.role}
                          onChange={(e) => update(u, { role: e.target.value })}
                        >
                          <option value="customer">Customer</option>
                          <option value="seller">Seller</option>
                        </select>
                      )}
                    </td>
                    <td>
                      <button
                        disabled={u.role === "admin"}
                        className={`badge ${u.isVerified ? "badge-success" : "badge-neutral"}`}
                        style={{ border: 0 }}
                        onClick={() => update(u, { isVerified: !u.isVerified })}
                      >
                        {u.isVerified ? "Verified" : "Unverified"}
                      </button>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
