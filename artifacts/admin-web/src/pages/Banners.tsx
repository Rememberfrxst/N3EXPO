import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { Image as ImageIcon, Plus, Trash2, X } from 'lucide-react';

export function Banners() {
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Banner Form State
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category Form State
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      adminApi.banners.list(),
      adminApi.categories.list(),
    ])
      .then(([bList, cList]) => {
        setBanners(bList);
        setCategories(cList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const presignedRes = await adminApi.uploads.presign([{ fileName: file.name, contentType: file.type, size: file.size }], 'banners');
      const uploadItem = presignedRes.uploads[0];

      await adminApi.uploads.putToS3(uploadItem.presignedUrl, file);
      setImageUrl(uploadItem.publicUrl);
    } catch (err: any) {
      alert('S3 Banner upload failed: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      alert('Please upload a banner image');
      return;
    }
    try {
      await adminApi.banners.create({ title, subtitle, imageUrl });
      setShowBannerModal(false);
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      fetchData();
    } catch (err: any) {
      alert('Error creating banner: ' + err.message);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Delete banner?')) return;
    try {
      await adminApi.banners.delete(id);
      fetchData();
    } catch (err: any) {
      alert('Error deleting banner: ' + err.message);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.categories.create({
        name: catName,
        slug: catSlug || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
      setShowCatModal(false);
      setCatName('');
      setCatSlug('');
      fetchData();
    } catch (err: any) {
      alert('Error creating category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete category?')) return;
    try {
      await adminApi.categories.delete(id);
      fetchData();
    } catch (err: any) {
      alert('Error deleting category: ' + err.message);
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">Content & Banners Management</h1>
          <p className="page-subtitle">Home screen carousel banners (S3 uploads) & category hierarchy ordering</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setShowCatModal(true)}>
            <Plus size={16} /> Add Category
          </button>
          <button className="btn btn-primary" onClick={() => setShowBannerModal(true)}>
            <Plus size={16} /> Add Home Banner
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Banners Section */}
        <div className="card-table">
          <div className="table-header">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Home Banners ({banners.length})</h3>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading banners...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Banner</th>
                  <th>Title</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {banners.map(b => (
                  <tr key={b.id}>
                    <td>
                      <img src={b.imageUrl} alt={b.title} style={{ width: 100, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.title || 'Untitled Banner'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.subtitle}</div>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => handleDeleteBanner(b.id)}>
                        <Trash2 size={16} color="var(--danger)" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Categories Section */}
        <div className="card-table">
          <div className="table-header">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Categories ({categories.length})</h3>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading categories...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Slug</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.slug}</td>
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
      </div>

      {/* Add Banner Modal */}
      {showBannerModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add Home Banner</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowBannerModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBanner}>
              <div className="form-group">
                <label className="form-label">Banner Title</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Grand Festive Sale" />
              </div>
              <div className="form-group">
                <label className="form-label">Subtitle</label>
                <input className="form-input" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Up to 60% OFF on Electronics" />
              </div>
              <div className="form-group">
                <label className="form-label">Banner Image File (Direct S3 Upload)</label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBannerUpload} className="form-input" />
                {uploadingImage && <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>Uploading to S3...</div>}
                {imageUrl && (
                  <div style={{ marginTop: 10 }}>
                    <img src={imageUrl} alt="Banner Preview" style={{ width: '100%', height: 120, borderRadius: 8, objectFit: 'cover' }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBannerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Banner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add New Category</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowCatModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input className="form-input" required value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Mobiles & Accessories" />
              </div>
              <div className="form-group">
                <label className="form-label">Slug (Optional)</label>
                <input className="form-input" value={catSlug} onChange={e => setCatSlug(e.target.value)} placeholder="mobiles" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCatModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
