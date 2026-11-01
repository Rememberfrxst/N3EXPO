import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  CreditCard,
  Tag,
  Image,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { adminApi, getAccessToken, clearAccessToken } from "./lib/api";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Products, Categories, Banners, Promotions } from "./pages/Catalog";
import { Orders } from "./pages/Orders";
import { Customers } from "./pages/Customers";
import { Payments } from "./pages/Payments";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";
const nav = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "customers", label: "Customers", icon: Users },
  { id: "promotions", label: "Offers & coupons", icon: Tag },
  { id: "banners", label: "Banners & events", icon: Image },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Store settings", icon: SettingsIcon },
];
export function App() {
  const [user, setUser] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState(location.hash.slice(1) || "dashboard"),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (getAccessToken())
      adminApi.auth
        .me()
        .then((u) => {
          if (u.role === "admin") setUser(u);
          else clearAccessToken();
        })
        .catch(clearAccessToken)
        .finally(() => setLoading(false));
    else setLoading(false);
    const h = () => setTab(location.hash.slice(1) || "dashboard");
    window.addEventListener("hashchange", h);
    const expired = () => {
      clearAccessToken();
      setUser(null);
    };
    window.addEventListener("admin-session-expired", expired);
    return () => {
      window.removeEventListener("hashchange", h);
      window.removeEventListener("admin-session-expired", expired);
    };
  }, []);
  const navigate = (id: string) => {
    location.hash = id;
    setTab(id);
    setMobile(false);
  };
  if (loading) return <div className="loading-screen">Opening your store…</div>;
  if (!user) return <Login onSuccess={setUser} />;
  return (
    <div className="app-layout">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        <a href="#dashboard" className="sidebar-logo">
          <span className="brand-mark">g.</span>
          <span>
            <strong>griper.</strong>
            <small>STORE STUDIO</small>
          </span>
        </a>
        <div className="store-switch">
          <span className="store-avatar">G</span>
          <span>
            <strong>Griper store</strong>
            <small>
              <i /> Owner workspace
            </small>
          </span>
        </div>
        <p className="nav-caption">YOUR WORKSPACE</p>
        <nav className="sidebar-nav">
          {nav.map((n, i) => (
            <React.Fragment key={n.id}>
              {i === 5 && <p className="nav-caption">GROW & MANAGE</p>}
              <button
                className={`nav-item ${tab === n.id ? "active" : ""}`}
                onClick={() => navigate(n.id)}
              >
                <n.icon size={18} />
                {n.label}
                {tab === n.id && (
                  <ChevronRight size={14} style={{ marginLeft: "auto" }} />
                )}
              </button>
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-owner">
          <span className="owner-avatar">{user.name?.[0] || "O"}</span>
          <div>
            <strong>{user.name}</strong>
            <small>Store owner</small>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={() => {
              clearAccessToken();
              setUser(null);
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={21} />
          </button>
          <span>Workspace</span>
          <ChevronRight size={13} />
          <strong>{nav.find((n) => n.id === tab)?.label || "Overview"}</strong>
          <div className="topbar-end">
            <span className="owner-pill">
              <i /> Owner access
            </span>
            <a
              href="https://github.com/Rememberfrxst/N3EXPO"
              target="_blank"
              rel="noreferrer"
            >
              Project <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        <main className="main-content">
          {tab === "dashboard" && <Dashboard navigate={navigate} />}{" "}
          {tab === "products" && <Products />}
          {tab === "categories" && <Categories />}
          {tab === "orders" && <Orders />}
          {tab === "customers" && <Customers />}
          {tab === "payments" && <Payments />}
          {tab === "promotions" && <Promotions />}
          {tab === "banners" && <Banners />}
          {tab === "analytics" && <Analytics />}
          {tab === "settings" && <Settings />}
          {!nav.some((n) => n.id === tab) && <Dashboard navigate={navigate} />}
          <footer className="workspace-footer">
            <span>Griper Store Studio</span>
            <span>A little better, every day.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
