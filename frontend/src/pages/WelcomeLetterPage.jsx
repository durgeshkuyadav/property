import { useState, useEffect } from 'react';
import { authAPI, pdfAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import toast from 'react-hot-toast';

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : '—';

export default function WelcomeLetterPage() {
  const [profile, setProfile] = useState(null);
  const [downloading, setDl]  = useState(false);

  useEffect(() => {
    authAPI.getMe().then(r => setProfile(r.data.data?.profile || r.data.data));
  }, []);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    setDl(true);
    try {
      const res = await pdfAPI.welcomeLetter();
      downloadBlob(res.data, `WelcomeLetter_${profile?.associate_code}.pdf`);
      toast.success('Downloaded!');
    } catch { toast.error('PDF failed'); }
    finally { setDl(false); }
  };

  const joiningFmt = profile?.joining_date
    ? new Date(profile.joining_date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
    : '—';

  return (
    <>
      <Topbar title="Welcome Letter" subtitle="Official joining confirmation document">
        <button className="btn btn-outline btn-sm" onClick={handlePrint}>🖨️ Print</button>
        <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF} disabled={downloading}>
          {downloading ? 'Generating…' : '⬇ Save as PDF'}
        </button>
      </Topbar>

      <div className="page-body">
        {!profile ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
        ) : (
          /* ── Letter content — matches image 3 exactly ─────── */
          <div id="welcome-letter" style={{
            maxWidth:700, margin:'0 auto',
            background:'#fff',
            border:'1px solid rgba(148,163,184,0.2)',
            borderRadius:16, padding:'48px 56px',
            boxShadow:'0 4px 24px rgba(99,102,241,0.08)',
            fontFamily:'Times New Roman, serif',
          }}>
            {/* Title */}
            <h1 style={{ textAlign:'center', fontSize:22, fontWeight:700, textDecoration:'underline', marginBottom:28, color:'#000', fontFamily:'Times New Roman, serif' }}>
              Welcome Letter
            </h1>

            {/* Salutation */}
            <p style={{ fontWeight:700, fontSize:13, marginBottom:14, color:'#000' }}>
              Dear {profile.name?.toUpperCase()},
            </p>

            {/* Body paragraphs */}
            <p style={{ fontSize:13, lineHeight:1.85, marginBottom:12, color:'#000', textAlign:'justify' }}>
              Welcome to the family of "AVYA HOME PRIVATE LIMITED". that give you all complete solution to wealth and freedom.
            </p>
            <p style={{ fontSize:13, lineHeight:1.85, marginBottom:12, color:'#000', textAlign:'justify', textIndent:'32px' }}>
              We have developed an effective and proven progress plan to help you launch a profitable business of your own progress and deliver a various growth against investment in real estate market for enhance your business. The income are tremendous for those who endure the effort required to develop a stable organization, one from which you can potentially benefit from eternally. We are confident that you will receive gratification from your involvement with "AVYA HOME PRIVATE LIMITED" and we wish you every success.
            </p>
            <p style={{ fontSize:13, lineHeight:1.85, marginBottom:12, color:'#000', textAlign:'justify' }}>
              TDS will be deducted on income as per income tax rules. The company shall deduct tax at sources from the incentives as per rates prescribed under the Income Tax Act 1961.
            </p>
            <p style={{ fontSize:13, lineHeight:1.85, marginBottom:24, color:'#000' }}>
              Keep it up……See you at the top.
            </p>

            {/* User ID + Joining Date */}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:12 }}>
              <div style={{ fontSize:13, color:'#000' }}>
                <strong>User ID: <span style={{ textDecoration:'underline' }}>{profile.associate_code}</span></strong>
              </div>
              <div style={{ fontSize:13, color:'#000' }}>
                <strong>Joining Date: <span style={{ textDecoration:'underline' }}>{joiningFmt}</span></strong>
              </div>
            </div>

            {/* Sign off */}
            <p style={{ fontSize:13, marginBottom:4, color:'#000' }}>Thanking You,</p>
            <p style={{ fontWeight:700, fontSize:13, marginBottom:32, color:'#000' }}>
              For AVYA HOME PRIVATE LIMITED,
            </p>

            {/* Signature line */}
            <div style={{ marginBottom:8 }}>
              <div style={{ width:180, borderBottom:'1px solid #000', marginBottom:4 }} />
              <p style={{ fontSize:13, fontStyle:'italic', color:'#000', marginBottom:24 }}>
                (Authorized Signatory)
              </p>
            </div>

            {/* Footer note */}
            <p style={{ fontSize:12, color:'#333', marginBottom:4 }}>
              Note*: This is computer generated receipt does not required signature.
            </p>
            <p style={{ fontSize:12, color:'#333' }}>
              (For More Details Log On To www.avyahome.com)
            </p>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #welcome-letter, #welcome-letter * { visibility: visible !important; }
          #welcome-letter {
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 100vw !important; max-width: none !important;
            border: none !important; border-radius: 0 !important;
            box-shadow: none !important; padding: 40px 60px !important;
            background: white !important;
          }
        }
      `}</style>
    </>
  );
}
