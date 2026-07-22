import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { Plus, Trash2, Tag, Layers, X } from 'lucide-react';

export function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [color, setColor] = useState('#4F46E5');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('1');

  const fetchCategories = () => {
    setLoading(true);
    adminApi.categories.list()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      await adminApi.categories.create({
        name,
        slug,
        icon,
        color,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&q=80',
        sortOrder: parseInt(sortOrder),
      });
      setShowAddModal(false);
      setName('');
      setImageUrl('');
      fetchCategories();
    } catch (err: any) {
      alert('Error creating category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await adminApi.categories.delete(id);
      fetchCategories();
    } catch (err: any) {
      alert('Error deleting category: ' + err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Category Management</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Manage item categories (Electronics, Food, Clothing, etc.)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading categories...</div>
        ) : categories.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No categories found. Click "Add Category" to create one.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Icon</th>
                <th>Sort Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={c.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&q=80'}
                        alt={c.name}
                        style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {c.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td><code>{c.slug}</code></td>
                  <td>
                    <span className="badge" style={{ backgroundColor: c.color ? `${c.color}20` : 'var(--bg-main)', color: c.color || 'var(--text-main)' }}>
                      {c.icon || 'tag'}
                    </span>
                  </td>
                  <td>{c.sortOrder ?? 0}</td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => handleDeleteCategory(c.id)}>
                      <Trash2 size={16} color="var(--danger)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add New Category</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  className="form-input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electronics, Clothing, Food & Grocery..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Icon Name</label>
                  <select className="form-input" value={icon} onChange={(e) => setIcon(e.target.value)}>
                    <option value="tag">Tag / General</option>
                    <option value="cellphone">Electronics / Mobile</option>
                    <option value="laptop">Laptop / Computers</option>
                    <option value="headphones">Audio / Headphones</option>
                    <option value="watch">Smartwatches</option>
                    <option value="tshirt">Clothing / Fashion</option>
                    <option value="food">Food & Grocery</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input className="form-input" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Image URL (Optional)</label>
                <input
                  className="form-input"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
