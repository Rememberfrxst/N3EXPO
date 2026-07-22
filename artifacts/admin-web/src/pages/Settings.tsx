import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { ShieldCheck, Send, Bell, KeyRound } from 'lucide-react';

export function Settings() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 2FA State
  const [totpSecret, setTotpSecret] = useState('');
  const [otpUrl, setOtpUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);

  // Broadcast Notification State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  useEffect(() => {
    adminApi.dashboard.auditLogs()
      .then(setAuditLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStart2FA = async () => {
    try {
      const res = await adminApi.auth.setup2FA();
      setTotpSecret(res.secret);
      setOtpUrl(res.otpAuthUrl);
    } catch (err: any) {
      alert('Failed to setup 2FA: ' + err.message);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.auth.verify2FA(verifyCode);
      setSetupSuccess(true);
      alert('2FA successfully enabled for your Admin account!');
    } catch (err: any) {
      alert('2FA Verification failed: ' + err.message);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingNotif(true);
    try {
      await adminApi.notifications.broadcast(notifTitle, notifBody);
      alert('Push Notification broadcast sent via Pusher!');
      setNotifTitle('');
      setNotifBody('');
    } catch (err: any) {
      alert('Failed to send push notification: ' + err.message);
    } finally {
      setSendingNotif(false);
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">Settings & Security Audit</h1>
          <p className="page-subtitle">Configure 2FA Authenticator, Admin Audit Logs & Global Push Notifications</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* 2FA Security Setup Box */}
        <div className="card-table" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldCheck size={20} color="var(--primary)" /> TOTP 2FA Authenticator Setup
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Protect your admin account with Google Authenticator or Authy TOTP 2FA.
          </p>

          {!totpSecret ? (
            <button className="btn btn-primary" onClick={handleStart2FA}>
              <KeyRound size={16} /> Setup 2FA Authenticator
            </button>
          ) : (
            <div>
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-main)', border: '1px solid var(--border)', fontSize: 13, marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>Secret Key:</div>
                <code style={{ fontSize: 16, color: 'var(--primary)', letterSpacing: 2 }}>{totpSecret}</code>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  URI: <code>{otpUrl}</code>
                </div>
              </div>

              {!setupSuccess && (
                <form onSubmit={handleVerify2FA}>
                  <div className="form-group">
                    <label className="form-label">Enter 6-digit Code to Activate</label>
                    <input
                      className="form-input"
                      required
                      maxLength={6}
                      value={verifyCode}
                      onChange={e => setVerifyCode(e.target.value)}
                      placeholder="123456"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Activate 2FA</button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Global Push Notifications Composer */}
        <div className="card-table" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Bell size={20} color="var(--warning)" /> Send Push Notification
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Broadcast real-time push notification alerts directly to all mobile app users.
          </p>

          <form onSubmit={handleSendNotification}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" required value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="e.g. Flash Sale Live! ⚡" />
            </div>
            <div className="form-group">
              <label className="form-label">Message Body</label>
              <textarea className="form-textarea" rows={2} required value={notifBody} onChange={e => setNotifBody(e.target.value)} placeholder="Get up to 50% discount on all mobile phones..." />
            </div>
            <button type="submit" className="btn btn-primary" disabled={sendingNotif}>
              <Send size={16} /> {sendingNotif ? 'Sending Broadcast...' : 'Send Broadcast'}
            </button>
          </form>
        </div>
      </div>

      {/* Admin Audit Logs Table */}
      <div className="card-table">
        <div className="table-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Admin Audit Logs ({auditLogs.length})</h3>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading audit logs...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Target Entity</th>
                <th>Admin Name</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{log.action}</td>
                  <td>{log.targetEntity || 'N/A'}</td>
                  <td>{log.adminName || 'Admin'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.ipAddress || '127.0.0.1'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
