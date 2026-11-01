import React, { useState } from "react";
import { adminApi, setAccessToken } from "../lib/api";
import { ShieldCheck, KeyRound, Lock } from "lucide-react";

interface LoginProps {
  onSuccess: (user: any) => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [require2FA, setRequire2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await adminApi.auth.login(email, password);
      if (res.require2FA) {
        setRequire2FA(true);
        setPendingUserId(res.userId!);
      } else if (res.accessToken) {
        if (res.user?.role !== "admin") {
          throw new Error("Access denied. Admin credentials required.");
        }
        setAccessToken(res.accessToken);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handle2FALogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await adminApi.auth.login2FA(pendingUserId, password, code);
      if (res.accessToken) {
        setAccessToken(res.accessToken);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || "2FA Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--primary)",
              margin: "0 auto 16px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={30} color="#FFF" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Griper Store Studio</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            {require2FA
              ? "Enter your 6-digit Authenticator Code"
              : "A thoughtful space to run your everyday store."}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: "var(--danger-light)",
              color: "var(--danger)",
              fontSize: 14,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {!require2FA ? (
          <form onSubmit={handleInitialLogin}>
            <div className="form-group">
              <label htmlFor="owner-email" className="form-label">
                Owner email
              </label>
              <input
                id="owner-email"
                autoComplete="username"
                type="email"
                className="form-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Owner email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="owner-password" className="form-label">
                Password
              </label>
              <input
                id="owner-password"
                autoComplete="current-password"
                type="password"
                className="form-input"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Sign in to your store"}
            </button>
          </form>
        ) : (
          <form onSubmit={handle2FALogin}>
            <div className="form-group">
              <label className="form-label">
                2FA Code (Google Authenticator / Authy)
              </label>
              <input
                type="text"
                className="form-input"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                style={{ textAlign: "center", fontSize: 20, letterSpacing: 4 }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? "Verifying 2FA..." : "Verify Code & Proceed"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
