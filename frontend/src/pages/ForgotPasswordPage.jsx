import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOTP = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError('Enter valid 10-digit mobile number'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.forgotPassword(mobile);
      toast.success('OTP sent to your registered email / mobile');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter 6-digit OTP'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.resetPassword({ mobile, otp, newPassword });
      toast.success('Password reset successfully! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Check your OTP.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: 'var(--gold)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Reset Password</h2>
          <p style={{ color: 'var(--ink3)', fontSize: 12, marginTop: 4 }}>
            {step === 1 ? 'Enter your registered mobile number' : `OTP sent to mobile ending in ${mobile.slice(-4)}`}
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          {['Mobile', 'OTP + New Password'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i === 1 ? 1 : 0 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step > i ? 'var(--green)' : step === i + 1 ? 'var(--gold)' : 'var(--border)',
                color: step >= i + 1 ? '#fff' : 'var(--ink3)', fontSize: 11, fontWeight: 700,
              }}>{step > i + 1 ? '✓' : i + 1}</div>
              <span style={{ fontSize: 11, color: step === i + 1 ? 'var(--ink)' : 'var(--ink3)', fontWeight: step === i + 1 ? 600 : 400 }}>{s}</span>
              {i === 0 && <div style={{ flex: 1, height: 1, background: step > 1 ? 'var(--green)' : 'var(--border)' }} />}
            </div>
          ))}
        </div>

        <div className="card">
          {error && (
            <div style={{ background: 'var(--redl)', border: '1px solid #F0B0A8', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: 'var(--red)' }}>
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={sendOTP}>
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input className="form-input" type="tel" placeholder="10-digit mobile" value={mobile} onChange={e => setMobile(e.target.value)} maxLength={10} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword}>
              <div className="form-group">
                <label className="form-label">Enter OTP</label>
                <input className="form-input" type="text" placeholder="6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} style={{ letterSpacing: '0.2em', fontSize: 18, textAlign: 'center' }} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min 8 chars, uppercase + number" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="Re-enter new password" value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => { setStep(1); setError(''); }} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 12, padding: 8 }}>
                ← Back
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login" style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>
            ← Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
