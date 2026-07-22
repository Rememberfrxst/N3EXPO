import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { BarChart3, Download, TrendingUp } from 'lucide-react';

export function Analytics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.dashboard.stats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const exportCSVReport = () => {
    const csvContent = `Metric,Value\nTotal Revenue,₹${stats?.totalRevenue || 0}\nTotal Orders,${stats?.totalOrders || 0}\nTotal Customers,${stats?.totalUsers || 0}\nLow Stock Items,${stats?.lowStockCount || 0}\nExport Date,${new Date().toISOString()}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `meta-store-analytics-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">Analytics & Sales Reports</h1>
          <p className="page-subtitle">Exportable store analytics, revenue performance & stock metrics</p>
        </div>
        <button className="btn btn-primary" onClick={exportCSVReport}>
          <Download size={16} /> Export CSV Report
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>Loading analytics metrics...</div>
      ) : (
        <div className="card-table" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Executive Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat( auto-fit, minmax(200px, 1fr) )', gap: 20 }}>
            <div style={{ padding: 20, borderRadius: 12, background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gross Sales Revenue</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
                ₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ padding: 20, borderRadius: 12, background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Processed Orders</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                {stats?.totalOrders || 0}
              </div>
            </div>
            <div style={{ padding: 20, borderRadius: 12, background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Active Customers</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#3B82F6', marginTop: 4 }}>
                {stats?.totalUsers || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
