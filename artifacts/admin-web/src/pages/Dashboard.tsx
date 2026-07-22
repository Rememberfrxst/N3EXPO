import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.dashboard.stats(),
      adminApi.dashboard.auditLogs(),
    ])
      .then(([statsRes, logsRes]) => {
        setStats(statsRes);
        setAuditLogs(logsRes.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading dashboard overview...</div>;
  }

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Real-time store metrics, sales revenue, and security telemetry</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{stats?.totalOrders || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-label">Registered Customers</div>
            <div className="stat-value">{stats?.totalUsers || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-label">Low Stock Alerts</div>
            <div className="stat-value">{stats?.lowStockCount || 0}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div className="card-table">
          <div className="table-header">
            <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="var(--primary)" /> Store Performance Highlights
            </h3>
          </div>
          <div style={{ padding: 24, fontSize: 14, color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: 12 }}>• System online & listening to live webhook payments via Razorpay.</p>
            <p style={{ marginBottom: 12 }}>• Direct S3 bucket image storage active on <code>NPX_META_P1020</code>.</p>
            <p>• Zero-trust security guards active on all API endpoints.</p>
          </div>
        </div>

        <div className="card-table">
          <div className="table-header">
            <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={18} color="var(--warning)" /> Recent Audit Trail
            </h3>
          </div>
          <div style={{ padding: 12 }}>
            {auditLogs.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No recent admin actions</div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.action}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    By {log.adminName || 'Admin'} • {new Date(log.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
