import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { Package, Truck, CheckCircle2, XCircle, Clock, Printer, Eye, X } from 'lucide-react';

export function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const fetchOrders = () => {
    setLoading(true);
    adminApi.orders.list()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await adminApi.orders.updateStatus(id, newStatus);
      fetchOrders();
      if (selectedOrder?.id === id) {
        setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      const details = await adminApi.orders.get(id);
      setSelectedOrder(details);
    } catch (err: any) {
      alert('Error fetching order details: ' + err.message);
    }
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-subtitle">Track, fulfill, update status & print customer invoices</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textTransform: 'capitalize', padding: '6px 16px', fontSize: 13 }}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="card-table">
        <div className="table-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Orders List ({filteredOrders.length})</h3>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading customer orders...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700 }}>#{o.orderNumber || o.id.slice(0, 8)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.customerName || 'Customer'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.customerEmail}</div>
                  </td>
                  <td>
                    <span className={`badge ${o.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {o.paymentStatus || 'pending'} ({o.paymentMethod || 'COD'})
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>₹{parseFloat(o.total || '0').toLocaleString('en-IN')}</td>
                  <td>
                    <select
                      className="form-select"
                      value={o.status || 'pending'}
                      onChange={e => handleUpdateStatus(o.id, e.target.value)}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleViewDetails(o.id)}>
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Order #{selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}</h2>
                <span className="badge badge-primary" style={{ marginTop: 4 }}>{selectedOrder.status}</span>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSelectedOrder(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, fontSize: 13 }}>
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Customer Details</div>
                <div>ID: {selectedOrder.userId}</div>
                <div>Payment Method: {selectedOrder.paymentMethod || 'COD'}</div>
                <div>Payment Status: {selectedOrder.paymentStatus}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Shiprocket & Fulfillment</div>
                <div>Tracking ID: SR-{selectedOrder.id.slice(0, 8).toUpperCase()}</div>
                <div>Courier Status: Active Sync</div>
              </div>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Ordered Items</h3>
            <div style={{ marginBottom: 20 }}>
              {(selectedOrder.items || []).map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Product ID: {item.productId.slice(0, 8)}...</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qty: {item.quantity} × ₹{item.unitPrice}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>₹{item.totalPrice}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Amount: </span>
                <span style={{ fontSize: 20, fontWeight: 800 }}>₹{selectedOrder.total}</span>
              </div>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
