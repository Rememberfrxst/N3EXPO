import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { Tag, Plus, Trash2, X } from 'lucide-react';

export function Promotions() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');

  const fetchCoupons = () => {
    setLoading(true);
    adminApi.coupons.list()
      .then(setCoupons)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.coupons.create({
        code: code.toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        minOrderValue: minOrderValue ? parseFloat(minOrderValue) : null,
      });
      setShowModal(false);
      setCode('');
      setDiscountValue('');
      setMinOrderValue('');
      fetchCoupons();
    } catch (err: any) {
      alert('Error creating coupon: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete coupon?')) return;
    try {
      await adminApi.coupons.delete(id);
      fetchCoupons();
    } catch (err: any) {
      alert('Error deleting coupon: ' + err.message);
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">Discounts & Promotions</h1>
          <p className="page-subtitle">Manage promotional coupon codes, flat/percentage discounts & minimum order thresholds</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      <div className="card-table">
        <div className="table-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Active Coupons ({coupons.length})</h3>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading coupons...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 800, color: 'var(--primary)', letterSpacing: 1 }}>{c.code}</td>
                  <td style={{ fontWeight: 700 }}>
                    {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {c.minOrderValue ? `₹${c.minOrderValue}` : 'No minimum'}
                  </td>
                  <td>
                    <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => handleDelete(c.id)}>
                      <Trash2 size={16} color="var(--danger)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Create Discount Coupon</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon}>
              <div className="form-group">
                <label className="form-label">Coupon Code</label>
                <input className="form-input" required value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. FESTIVE20" style={{ textTransform: 'uppercase' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Discount Type</label>
                  <select className="form-select" value={discountType} onChange={e => setDiscountType(e.target.value)}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Value</label>
                  <input className="form-input" required type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="20" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Minimum Order Value (₹) Optional</label>
                <input className="form-input" type="number" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)} placeholder="999" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Coupon</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
