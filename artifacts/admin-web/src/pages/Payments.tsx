import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { CreditCard, CheckCircle, RefreshCw } from 'lucide-react';

export function Payments() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.orders.list()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  const totalPending = orders
    .filter(o => o.paymentStatus !== 'paid')
    .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">Payments & Gateway Reconciliation</h1>
          <p className="page-subtitle">Razorpay transactions, payment verification & refund reconciliation</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="stat-label">Settled / Paid Total</div>
            <div className="stat-value">₹{totalPaid.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
            <RefreshCw size={24} />
          </div>
          <div>
            <div className="stat-label">Pending Settlements</div>
            <div className="stat-value">₹{totalPending.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      <div className="card-table">
        <div className="table-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Transaction Logs</h3>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading payment logs...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Gateway / Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700 }}>#{o.orderNumber || o.id.slice(0, 8)}</td>
                  <td style={{ textTransform: 'uppercase', fontWeight: 600 }}>{o.paymentMethod || 'COD'}</td>
                  <td style={{ fontWeight: 700 }}>₹{o.total}</td>
                  <td>
                    <span className={`badge ${o.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {o.paymentStatus || 'pending'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
