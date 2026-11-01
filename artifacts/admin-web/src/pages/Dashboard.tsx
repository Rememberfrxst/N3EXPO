import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  IndianRupee,
  ShoppingBag,
  Users,
  Package,
  Plus,
  Image,
  Tag,
  ChevronRight,
  Clock,
} from "lucide-react";
import { adminApi } from "../lib/api";
const money = (v: any) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
export function Dashboard({ navigate }: { navigate: (id: string) => void }) {
  const [stats, setStats] = useState<any>(null),
    [logs, setLogs] = useState<any[]>([]),
    [error, setError] = useState("");
  const load = () => {
    setError("");
    Promise.all([adminApi.dashboard.stats(), adminApi.dashboard.auditLogs()])
      .then(([s, l]) => {
        setStats(s);
        setLogs(l.slice(0, 4));
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);
  return (
    <div>
      <div className="header">
        <div>
          <p className="eyebrow">YOUR STORE, AT A GLANCE</p>
          <h1 className="page-title">Good things are growing.</h1>
          <p className="page-subtitle">
            Here’s what’s happening in your store. Let’s make today a good one.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("products")}
        >
          <Plus size={16} /> Add a product
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <button className="text-button" onClick={load}>
            Retry
          </button>
        </div>
      )}
      <div className="stats-grid">
        {[
          {
            label: "Total revenue",
            value: stats ? money(stats.totalRevenue) : "—",
            note: "From paid orders",
            icon: IndianRupee,
          },
          {
            label: "Orders received",
            value: stats?.totalOrders ?? "—",
            note: "Across your store",
            icon: ShoppingBag,
          },
          {
            label: "Your community",
            value: stats?.totalUsers ?? "—",
            note: "Registered accounts",
            icon: Users,
          },
          {
            label: "Low stock items",
            value: stats?.lowStockCount ?? "—",
            note: "5 or fewer units available",
            icon: Package,
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              <span className="stat-label">{s.label}</span>
              <span className="stat-icon">
                <s.icon size={18} />
              </span>
            </div>
            <div className="stat-value">{s.value}</div>
            <span className="stat-note">{s.note}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <div>
          <section className="card-table">
            <div className="panel-heading">
              <div>
                <h2>Recent orders</h2>
                <p>A little care goes a long way. Keep things moving.</p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => navigate("orders")}
              >
                View all <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Placed</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentOrders?.map((o: any) => (
                    <tr key={o.id}>
                      <td>
                        <strong>#{o.orderNumber}</strong>
                        <small>{o.paymentMethod?.toUpperCase()}</small>
                      </td>
                      <td>
                        {new Date(o.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td>{money(o.total)}</td>
                      <td>
                        <span
                          className={`badge ${o.status === "delivered" ? "badge-success" : o.status === "cancelled" ? "badge-neutral" : "badge-warning"}`}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stats?.recentOrders?.length === 0 && (
              <div className="empty-state">
                <ShoppingBag size={28} />
                <p>Your first order will appear here.</p>
              </div>
            )}
            <div className="table-footer">
              Latest {stats?.recentOrders?.length || 0} orders · All amounts in
              INR
            </div>
          </section>
          <section className="panel" style={{ marginTop: 22 }}>
            <div className="panel-heading">
              <div>
                <h2>From your catalog</h2>
                <p>Your most purchased products.</p>
              </div>
              <Package size={18} color="var(--text-muted)" />
            </div>
            <div className="sellers-list">
              {stats?.bestSellers?.map((p: any, i: number) => (
                <div className="seller-row" key={p.id}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.stock} in stock · {p.totalSold || 0} sold
                    </small>
                  </div>
                  <b>{money(p.price)}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div>
          <div className="editorial-card">
            <p className="eyebrow">A STORE THAT FEELS LIKE YOU</p>
            <h2>
              Small details.
              <br />A lasting impression.
            </h2>
            <p>
              Freshen up your home banner and give your next collection a moment
              in the spotlight.
            </p>
            <button
              className="btn btn-secondary"
              style={{ marginTop: 20, background: "#ffffffa0" }}
              onClick={() => navigate("banners")}
            >
              Plan a campaign <ArrowUpRight size={14} />
            </button>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h2>A few useful shortcuts</h2>
            </div>
            {[
              {
                id: "products",
                title: "Curate your catalog",
                sub: "Add a good find to the shop",
                icon: Package,
              },
              {
                id: "banners",
                title: "Make an announcement",
                sub: "Schedule banners & store events",
                icon: Image,
              },
              {
                id: "promotions",
                title: "Give a little extra",
                sub: "Create an offer or coupon",
                icon: Tag,
              },
            ].map((a) => (
              <button
                className="quick-action"
                key={a.id}
                onClick={() => navigate(a.id)}
              >
                <span className="stat-icon">
                  <a.icon size={17} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <small>{a.sub}</small>
                </div>
                <ChevronRight size={15} color="var(--text-muted)" />
              </button>
            ))}
          </section>
          <section className="panel" style={{ marginTop: 22 }}>
            <div className="panel-heading">
              <h2>Recent activity</h2>
              <Clock size={16} color="var(--text-muted)" />
            </div>
            {logs.length ? (
              logs.map((l) => (
                <div className="activity-item" key={l.id}>
                  <span className="stock-dot" />
                  <div>
                    <strong>
                      {l.action.toLowerCase().replaceAll("_", " ")}
                    </strong>
                    <small>
                      {new Date(l.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {l.adminName || "Owner"}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: 25 }}>
                <p>Your store activity will appear here.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
