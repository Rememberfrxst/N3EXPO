import React, { useEffect, useState } from "react";
import { Eye, X, Printer, ShoppingBag } from "lucide-react";
import { adminApi } from "../lib/api";
const statuses = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];
const money = (v: any) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
export function Orders() {
  const [orders, setOrders] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () => {
    setLoading(true);
    adminApi.orders
      .list()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  const update = async (id: string, status: string, paymentStatus?: string) => {
    setBusy(true);
    setError("");
    try {
      await adminApi.orders.updateStatus(id, status, paymentStatus);
      load();
      if (selected?.id === id) setSelected(await adminApi.orders.get(id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const view = async (id: string) => {
    try {
      setSelected(await adminApi.orders.get(id));
    } catch (e: any) {
      setError(e.message);
    }
  };
  const list = orders.filter((o) => filter === "all" || o.status === filter);
  return (
    <div>
      <div className="header">
        <div>
          <p className="eyebrow">A LITTLE CARE, EVERY STEP</p>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">
            From your store to their doorstep. Keep every order moving.
          </p>
        </div>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <div className="card-table">
        <div className="resource-toolbar">
          <div className="tabs" style={{ flexWrap: "wrap" }}>
            {["all", ...statuses].map((s) => (
              <button
                className={filter === s ? "selected" : ""}
                key={s}
                onClick={() => setFilter(s)}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="empty-state">Loading orders…</div>
        ) : !list.length ? (
          <div className="empty-state">
            <ShoppingBag size={30} />
            <h3>All quiet for now.</h3>
            <p>Orders in this view will appear here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Fulfillment</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>#{o.orderNumber}</strong>
                      <small>
                        {new Date(o.createdAt).toLocaleDateString("en-IN")}
                      </small>
                    </td>
                    <td>
                      <strong>{o.customerName}</strong>
                      <small>{o.customerEmail}</small>
                    </td>
                    <td>
                      <span
                        className={`badge ${o.paymentStatus === "paid" ? "badge-success" : "badge-warning"}`}
                      >
                        {o.paymentStatus}
                      </span>
                      <small>{o.paymentMethod?.toUpperCase()}</small>
                    </td>
                    <td>{money(o.total)}</td>
                    <td>
                      <select
                        aria-label={`Status for order ${o.orderNumber}`}
                        className="form-select"
                        disabled={busy}
                        value={o.status}
                        onChange={(e) => update(o.id, e.target.value)}
                      >
                        {statuses.map((s) => (
                          <option value={s} key={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => view(o.id)}
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <div className="modal-overlay">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">ORDER DETAILS</p>
                <h2 id="order-title">#{selected.orderNumber}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close order"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <span className="badge badge-primary">{selected.status}</span>
            <div className="order-summary">
              <div>
                <small>PAYMENT</small>
                {selected.paymentMethod?.toUpperCase()} ·{" "}
                {selected.paymentStatus}
                <br />
                {selected.paymentMethod === "cod" &&
                  selected.paymentStatus !== "paid" && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        update(selected.id, selected.status, "paid")
                      }
                    >
                      Mark cash collected
                    </button>
                  )}
              </div>
              <div>
                <small>PLACED ON</small>
                {new Date(selected.createdAt).toLocaleString("en-IN")}
                {selected.deliveredAt && (
                  <small>
                    Delivered{" "}
                    {new Date(selected.deliveredAt).toLocaleDateString("en-IN")}
                  </small>
                )}
              </div>
            </div>
            <div className="detail-items">
              {selected.items.map((i: any) => (
                <div className="detail-item" key={i.id}>
                  <div>
                    <strong>{i.name || "Product"}</strong>
                    <small>
                      {i.quantity} × {money(i.unitPrice)}
                    </small>
                  </div>
                  <strong>{money(i.totalPrice)}</strong>
                </div>
              ))}
            </div>
            <div className="invoice-totals">
              <div>
                <span>Subtotal</span>
                <span>{money(selected.subtotal)}</span>
              </div>
              <div>
                <span>Delivery</span>
                <span>{money(selected.shippingFee)}</span>
              </div>
              <div>
                <span>Discount</span>
                <span>−{money(selected.discount)}</span>
              </div>
              <div style={{ fontSize: 20, marginTop: 15 }}>
                <strong>Total</strong>
                <strong>{money(selected.total)}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
