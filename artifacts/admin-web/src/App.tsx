import React, { useEffect, useState } from 'react';
import { adminApi, getAccessToken, clearAccessToken } from './lib/api';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Customers } from './pages/Customers';
import { Payments } from './pages/Payments';
import { Promotions } from './pages/Promotions';
import { Banners } from './pages/Banners';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

import { Categories } from './pages/Categories';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  CreditCard,
  Tag,
  Image as ImageIcon,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

export function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'orders' | 'customers' | 'payments' | 'promotions' | 'banners' | 'analytics' | 'settings'>('dashboard');

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      adminApi.auth.me()
        .then(res => {
          if (res.role === 'admin') {
            setUser(res);
          } else {
            clearAccessToken();
          }
        })
        .catch(() => clearAccessToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    clearAccessToken();
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 600 }}>Loading Admin Portal...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onSuccess={setUser} />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">M</div>
          <div>
            <div className="sidebar-logo-text">Meta Admin</div>
            <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>Zero-Trust Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <Package size={18} /> Products & Stock
          </button>
          <button className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            <FolderTree size={18} /> Categories
          </button>
          <button className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <ShoppingCart size={18} /> Orders & Invoice
          </button>
          <button className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
            <Users size={18} /> Customers & Roles
          </button>
          <button className={`nav-item ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
            <CreditCard size={18} /> Payments & Gateways
          </button>
          <button className={`nav-item ${activeTab === 'promotions' ? 'active' : ''}`} onClick={() => setActiveTab('promotions')}>
            <Tag size={18} /> Discounts & Coupons
          </button>
          <button className={`nav-item ${activeTab === 'banners' ? 'active' : ''}`} onClick={() => setActiveTab('banners')}>
            <ImageIcon size={18} /> Banners & Content
          </button>
          <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <BarChart3 size={18} /> Sales Analytics
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <SettingsIcon size={18} /> Settings & 2FA
          </button>
        </nav>

        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{user.email}</div>
          <button className="btn btn-secondary" style={{ width: '100%', padding: '8px 12px', fontSize: 13 }} onClick={handleLogout}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'products' && <Products />}
        {activeTab === 'categories' && <Categories />}
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'customers' && <Customers />}
        {activeTab === 'payments' && <Payments />}
        {activeTab === 'promotions' && <Promotions />}
        {activeTab === 'banners' && <Banners />}
        {activeTab === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}

