import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { Users, Shield, CheckCircle, XCircle } from 'lucide-react';

export function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = () => {
    setLoading(true);
    adminApi.customers.list()
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleToggleVerified = async (user: any) => {
    try {
      await adminApi.customers.update(user.id, { isVerified: !user.isVerified });
      fetchCustomers();
    } catch (err: any) {
      alert('Error updating user: ' + err.message);
    }
  };

  const handleToggleRole = async (user: any) => {
    const newRole = user.role === 'admin' ? 'customer' : 'admin';
    if (!confirm(`Are you sure you want to change role for ${user.name} to ${newRole}?`)) return;
    try {
      await adminApi.customers.update(user.id, { role: newRole });
      fetchCustomers();
    } catch (err: any) {
      alert('Error updating role: ' + err.message);
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">Customer Management</h1>
          <p className="page-subtitle">User accounts, verification status, role-based access & 2FA monitoring</p>
        </div>
      </div>

      <div className="card-table">
        <div className="table-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Users ({customers.length})</h3>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading user directory...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Phone</th>
                <th>Role</th>
                <th>2FA Status</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{c.phone || 'N/A'}</td>
                  <td>
                    <button
                      onClick={() => handleToggleRole(c)}
                      className={`badge ${c.role === 'admin' ? 'badge-primary' : 'badge-warning'}`}
                      style={{ border: 'none', cursor: 'pointer', textTransform: 'capitalize' }}
                    >
                      {c.role || 'customer'}
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${c.is2faEnabled ? 'badge-success' : 'badge-danger'}`}>
                      {c.is2faEnabled ? '2FA Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${c.isVerified ? 'badge-success' : 'badge-warning'}`}>
                      {c.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleToggleVerified(c)}>
                      {c.isVerified ? 'Unverify' : 'Verify'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
