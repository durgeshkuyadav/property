import { useState } from 'react';
import { authAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState({ old: false, new: false, confirm: false });

  const validate = () => {
    const e = {};
    if (!form.oldPassword) e.oldPassword = 'Old password is required';
    if (form.newPassword.length < 8) e.newPassword = 'Min 8 characters required';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.newPassword)) e.newPassword = 'Must contain uppercase, lowercase and number';
    if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword, confirmPassword: form.confirmPassword });
      toast.success('Password changed successfully!');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password';
      toast.error(msg);
      if (msg.toLowerCase().includes('old')) setErrors({ oldPassword: msg });
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ name, label, showKey }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className={`form-input ${errors[name] ? 'error' : ''}`}
          type={show[showKey] ? 'text' : 'password'}
          placeholder={`Enter ${label.toLowerCase()}`}
          value={form[name]}
          onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          style={{ paddingRight: 40 }}
        />
        <button type="button" onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 12, cursor: 'pointer' }}>
          {show[showKey] ? 'Hide' : 'Show'}
        </button>
      </div>
      {errors[name] && <div className="form-error">{errors[name]}</div>}
    </div>
  );

  return (
    <>
      <Topbar title="Change Password" subtitle="Update your account password" />
      <div className="page-body">
        <div style={{ maxWidth: 420 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 42, height: 42, background: 'var(--redl)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Secure your account</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Use a strong password with uppercase, lowercase and numbers</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <Field name="oldPassword" label="Old Password" showKey="old" />
              <Field name="newPassword" label="New Password" showKey="new" />
              <Field name="confirmPassword" label="Confirm New Password" showKey="confirm" />
              <div style={{ background: 'var(--goldl)', border: '1px solid #E8C840', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 11, color: 'var(--amber)' }}>
                Password must be at least 8 characters and contain uppercase letter, lowercase letter, and a number.
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Saving...' : 'Save Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
