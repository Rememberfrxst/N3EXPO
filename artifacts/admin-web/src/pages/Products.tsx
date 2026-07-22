import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { Plus, Upload, Trash2, Edit, Check, X, FileText, Image as ImageIcon } from 'lucide-react';

export function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('10');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Bulk State
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchProducts = () => {
    setLoading(true);
    adminApi.products.list()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchCategories = () => {
    adminApi.categories.list()
      .then(setCategories)
      .catch(console.error);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB cap');
      return;
    }

    setUploadingImage(true);
    try {
      const presignedRes = await adminApi.uploads.presign([{ fileName: file.name, contentType: file.type, size: file.size }], 'products');
      const uploadItem = presignedRes.uploads[0];

      await adminApi.uploads.putToS3(uploadItem.presignedUrl, file);
      setImageUrl(uploadItem.publicUrl);
    } catch (err: any) {
      alert('S3 Image Upload failed: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.products.create({
        name,
        description,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        categoryId: categoryId || null,
        brand,
        sku,
        stock: parseInt(stock),
        images: imageUrl ? [imageUrl] : [],
      });
      setShowAddModal(false);
      setName('');
      setDescription('');
      setPrice('');
      setCompareAtPrice('');
      setCategoryId('');
      setBrand('');
      setSku('');
      setImageUrl('');
      fetchProducts();
    } catch (err: any) {
      alert('Error creating product: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await adminApi.products.delete(id);
      fetchProducts();
    } catch (err: any) {
      alert('Error deleting product: ' + err.message);
    }
  };

  const handleToggleActive = async (p: any) => {
    try {
      await adminApi.products.update(p.id, { isActive: !p.isActive });
      fetchProducts();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleBulkImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const lines = csvText.trim().split('\n');
      const items = lines.map(line => {
        const [name, price, stock, brand, description] = line.split(',').map(s => s.trim());
        return { name, price, stock, brand, description };
      });

      const res = await adminApi.products.bulkUpload(items);
      alert(`Successfully imported ${res.importedCount} products!`);
      setShowBulkModal(false);
      setCsvText('');
      fetchProducts();
    } catch (err: any) {
      alert('Bulk import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">Product Management</h1>
          <p className="page-subtitle">Catalog control, inventory stock, S3 image uploads & CSV bulk import</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setShowBulkModal(true)}>
            <Upload size={16} /> Bulk CSV Import
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="card-table">
        <div className="table-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>All Products ({products.length})</h3>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading products catalog...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Brand / SKU</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={p.images?.[0]?.url || 'https://placehold.co/50x50'}
                        alt={p.name}
                        style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {p.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>₹{parseFloat(p.price).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`badge ${p.stock > 5 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                      {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    <div>{p.brand || 'No brand'}</div>
                    <div style={{ fontSize: 11 }}>{p.sku}</div>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`badge ${p.isActive ? 'badge-success' : 'badge-warning'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                    >
                      {p.isActive ? 'Active' : 'Draft'}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: 6, marginRight: 6 }} onClick={() => handleDeleteProduct(p.id)}>
                      <Trash2 size={16} color="var(--danger)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add New Product</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input className="form-input" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wireless Headphones" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                    <option value="">Select Category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <input className="form-input" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Sony" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input className="form-input" required type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="2999" />
                </div>
                <div className="form-group">
                  <label className="form-label">Original Price (₹)</label>
                  <input className="form-input" type="number" value={compareAtPrice} onChange={e => setCompareAtPrice(e.target.value)} placeholder="4999" />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Quantity</label>
                  <input className="form-input" type="number" required value={stock} onChange={e => setStock(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Product features & details..." />
              </div>

              <div className="form-group">
                <label className="form-label">Product Image (Direct AWS S3 Upload)</label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="form-input" />
                {uploadingImage && <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>Uploading directly to S3 bucket...</div>}
                {imageUrl && (
                  <div style={{ marginTop: 10 }}>
                    <img src={imageUrl} alt="Preview" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Bulk CSV Product Import</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowBulkModal(false)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Paste CSV rows in format: <code>name, price, stock, brand, description</code> (Max 500 rows per batch. Automatic formula injection protection enabled).
            </p>

            <textarea
              className="form-textarea"
              rows={8}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder="Wireless Mouse, 599, 50, Logitech, Ergo optical mouse&#10;Gaming Keyboard, 1899, 20, Redragon, RGB mechanical keyboard"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleBulkImport} disabled={importing}>
                {importing ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
