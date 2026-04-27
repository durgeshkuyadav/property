import { useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Section = ({ title, icon, children }) => (
  <div className="card">
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div className="card-title">{title}</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
  </div>
);

const Field = ({ label, name, value, onChange, type = 'text', fullWidth, options }) => (
  <div className="form-group" style={fullWidth ? { gridColumn: '1/-1' } : {}}>
    <label className="form-label">{label}</label>
    {options ? (
      <select className="form-input" name={name} value={value || ''} onChange={onChange}>
        <option value="">-- Select --</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input className="form-input" type={type} name={name} value={value || ''} onChange={onChange} placeholder={`Enter ${label.toLowerCase()}`} />
    )}
  </div>
);

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sponsor, setSponsor] = useState(null);

  useEffect(() => {
    authAPI.getMe().then(r => {
      setProfile(r.data.data.profile || {});
      setSponsor(r.data.data.sponsor);
    }).finally(() => setLoading(false));
  }, []);

  const handleChange = e => setProfile(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateMe(profile);
      updateUser({ name: profile.name, email: profile.email });
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <>
      <Topbar title="Profile Edit" subtitle="Loading..." />
      <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}><div className="spinner" /></div>
    </>
  );

  return (
    <>
      <Topbar title="Profile Edit" subtitle="Update your personal, nominee and bank details">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Update Record'}
        </button>
      </Topbar>
      <div className="page-body">
        {/* ID Banner */}
        <div style={{ background: 'var(--ink)', borderRadius: 12, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff' }}>
              {profile.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{profile.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{profile.associate_code} · {profile.role}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[['Associate ID', profile.associate_code], ['Joining Date', profile.joining_date ? new Date(profile.joining_date).toLocaleDateString('en-IN') : '—'], ['Sponsor', sponsor?.name || '—']].map(([l, v]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 14 }}>
          <div>
            <Section title="Personal Information" icon="👤">
              <Field label="Full Name" name="name" value={profile.name} onChange={handleChange} />
              <Field label="Mobile" name="mobile" value={profile.mobile} onChange={handleChange} type="tel" />
              <Field label="Father's Name" name="father_name" value={profile.father_name} onChange={handleChange} />
              <Field label="Email" name="email" value={profile.email} onChange={handleChange} type="email" />
              <Field label="Date of Birth" name="date_of_birth" value={profile.date_of_birth?.slice(0,10)} onChange={handleChange} type="date" />
              <Field label="Anniversary Date" name="anniversary_date" value={profile.anniversary_date?.slice(0,10)} onChange={handleChange} type="date" />
              <Field label="Gender" name="gender" value={profile.gender} onChange={handleChange} options={['Male','Female','Other']} />
              <Field label="Marital Status" name="marital_status" value={profile.marital_status} onChange={handleChange} options={['Single','Married','Divorced','Widowed']} />
              <Field label="PAN Number" name="pan_number" value={profile.pan_number} onChange={handleChange} />
              <Field label="Aadhar Number" name="aadhar_number" value={profile.aadhar_number} onChange={handleChange} />
              <Field label="Current Occupation" name="current_occupation" value={profile.current_occupation} onChange={handleChange} />
              <Field label="Work With Company" name="work_company" value={profile.work_company} onChange={handleChange} />
              <Field label="Address" name="address" value={profile.address} onChange={handleChange} fullWidth />
            </Section>
          </div>

          <div>
            <Section title="Nominee Information" icon="❤️">
              <Field label="Nominee Name" name="nominee_name" value={profile.nominee_name} onChange={handleChange} />
              <Field label="Relationship" name="nominee_relation" value={profile.nominee_relation} onChange={handleChange} />
              <Field label="Nominee Mobile" name="nominee_mobile" value={profile.nominee_mobile} onChange={handleChange} type="tel" />
              <Field label="Nominee Age" name="nominee_age" value={profile.nominee_age} onChange={handleChange} type="number" />
              <Field label="Nominee Gender" name="nominee_gender" value={profile.nominee_gender} onChange={handleChange} options={['Male','Female','Other']} />
            </Section>

            <Section title="Bank Information" icon="🏦">
              <Field label="Bank A/C Number" name="bank_account_no" value={profile.bank_account_no} onChange={handleChange} />
              <Field label="IFSC Code" name="bank_ifsc" value={profile.bank_ifsc} onChange={handleChange} />
              <Field label="Bank Name" name="bank_name" value={profile.bank_name} onChange={handleChange} />
              <Field label="Branch" name="bank_branch" value={profile.bank_branch} onChange={handleChange} />
            </Section>
          </div>
        </div>

        <div style={{ marginTop: 4 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', fontSize: 13 }}>
            {saving ? 'Saving...' : 'Update Record'}
          </button>
        </div>
      </div>
    </>
  );
}
