import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

/* ── Floating particle background ───────────────────────────── */
function Particles() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      {[...Array(18)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width:  `${Math.random()*220+60}px`,
          height: `${Math.random()*220+60}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${
            ['rgba(129,140,248,0.18)','rgba(167,139,250,0.14)','rgba(99,102,241,0.12)','rgba(196,181,253,0.1)'][i%4]
          } 0%, transparent 70%)`,
          left:  `${Math.random()*100}%`,
          top:   `${Math.random()*100}%`,
          transform: 'translate(-50%,-50%)',
          animation: `float${i%3} ${12+Math.random()*8}s ease-in-out infinite`,
          animationDelay: `${Math.random()*6}s`,
        }} />
      ))}
    </div>
  );
}

/* ── Check icon ─────────────────────────────────────────────── */
const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [mobile,   setMobile]   = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [errors,   setErrors]   = useState({});
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const validate = () => {
    const e = {};
    if (!/^[6-9]\d{9}$/.test(mobile)) e.mobile = 'Enter valid 10-digit mobile';
    if (!password)                      e.password = 'Password required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(mobile, password);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid mobile or password';
      toast.error(msg);
      if (err.response?.data?.errors) {
        const fe = {};
        err.response.data.errors.forEach(e => { fe[e.field] = e.message; });
        setErrors(fe);
      }
    } finally { setLoading(false); }
  };

  const inputBase = (hasErr) => ({
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: `1.5px solid ${hasErr ? 'rgba(248,113,113,0.8)' : 'rgba(255,255,255,0.18)'}`,
    borderRadius: 12, fontSize: 14, color: '#fff', outline: 'none',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.2s ease',
    WebkitTextFillColor: '#fff',
  });

  const labelStyle = {
    display: 'block', fontSize: 10.5, fontWeight: 700, color: 'rgba(196,181,253,0.9)',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7,
  };

  return (
    <div style={{
      minHeight: '100vh', minWidth: '100vw',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1e1b4b 35%, #2d2a6e 65%, #1a1851 100%)',
      position: 'relative', overflow: 'hidden', padding: '20px',
    }}>
      <Particles />

      {/* Grid texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Glow blobs */}
      <div style={{ position:'absolute', top:'10%', left:'20%', width:500, height:500, background:'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 60%)', pointerEvents:'none', borderRadius:'50%' }} />
      <div style={{ position:'absolute', bottom:'10%', right:'15%', width:400, height:400, background:'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 60%)', pointerEvents:'none', borderRadius:'50%' }} />

      {/* Main container */}
      <div style={{
        display: 'flex', width: '100%', maxWidth: 960, minHeight: 560,
        borderRadius: 28, overflow: 'hidden',
        boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.97)',
        opacity: mounted ? 1 : 0,
        transition: 'all 0.55s cubic-bezier(0.34,1.4,0.64,1)',
      }}>

        {/* ── LEFT INFO PANEL ─────────────────────────────── */}
        <div style={{
          flex: 1, padding: '52px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          background: 'rgba(255,255,255,0.04)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          minWidth: 0,
        }} className="login-left">

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:44 }}>
            <div style={{
              width:44, height:44, borderRadius:13, flexShrink:0,
              background:'linear-gradient(135deg,#818CF8,#6366F1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 6px 20px rgba(99,102,241,0.55)',
            }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div style={{fontSize:15, fontWeight:700, color:'#fff', letterSpacing:'-0.2px'}}>Avya Home</div>
              <div style={{fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:2}}>CRM Platform</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{marginBottom:18}}>
            <div style={{
              fontSize:'clamp(28px,4vw,42px)', fontWeight:800, color:'#fff',
              lineHeight:1.15, letterSpacing:'-1.5px', fontFamily:"'Plus Jakarta Sans',sans-serif",
            }}>
              Real Estate.<br/>
              <span style={{
                background:'linear-gradient(90deg,#818CF8,#C4B5FD 60%,#A78BFA)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              }}>Simplified.</span>
            </div>
          </div>

          <p style={{fontSize:13.5, color:'rgba(255,255,255,0.45)', lineHeight:1.75, marginBottom:40, maxWidth:340}}>
            Manage plots, associates and commissions from one powerful platform built for Indian real estate.
          </p>

          {/* Features */}
          <div style={{display:'flex', flexDirection:'column', gap:14}}>
            {[
              'Auto TDS deduction (Section 194H / 206AA)',
              'Real-time commission & payout tracking',
              'Unlimited depth associate network',
            ].map((f,i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:12,
                animation:'fadeUp 0.5s ease both',
                animationDelay:`${0.2+i*0.1}s`,
              }}>
                <div style={{
                  width:22, height:22, borderRadius:'50%', flexShrink:0,
                  background:'rgba(129,140,248,0.15)',
                  border:'1px solid rgba(129,140,248,0.4)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}><Check /></div>
                <span style={{fontSize:13, color:'rgba(255,255,255,0.55)'}}>{f}</span>
              </div>
            ))}
          </div>

          {/* Floating badge */}
          <div style={{
            marginTop:44, display:'inline-flex', alignItems:'center', gap:8,
            background:'rgba(255,255,255,0.07)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:99, padding:'8px 16px', width:'fit-content',
            animation:'fadeUp 0.5s 0.5s ease both',
          }}>
            <div style={{width:8, height:8, borderRadius:'50%', background:'#34D399', boxShadow:'0 0 0 3px rgba(52,211,153,0.2)'}} />
            <span style={{fontSize:11.5, color:'rgba(255,255,255,0.6)', fontWeight:500}}>System online · Secure connection</span>
          </div>
        </div>

        {/* ── RIGHT GLASS CARD ─────────────────────────────── */}
        <div style={{
          width: '46%', minWidth: 320, maxWidth: 440, padding: '52px 44px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }} className="login-right">

          <div style={{marginBottom:32}}>
            <h1 style={{
              fontSize:24, fontWeight:800, color:'#fff', letterSpacing:'-0.5px',
              fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:8,
            }}>Sign in</h1>
            <p style={{fontSize:13, color:'rgba(255,255,255,0.45)'}}>
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Mobile */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Mobile Number</label>
              <div style={{position:'relative'}}>
                <span style={{
                  position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                  fontSize:13, fontWeight:600, color:'rgba(196,181,253,0.8)', userSelect:'none',
                }}>+91</span>
                <input
                  type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210"
                  value={mobile} onChange={e => { setMobile(e.target.value.replace(/\D/g,'').slice(0,10)); setErrors(p=>({...p,mobile:''})); }}
                  autoComplete="tel-national"
                  style={{...inputBase(errors.mobile), paddingLeft:50}}
                  onFocus={e => { e.target.style.borderColor='rgba(167,139,250,0.8)'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.2)'; e.target.style.background='rgba(255,255,255,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor=errors.mobile?'rgba(248,113,113,0.8)':'rgba(255,255,255,0.18)'; e.target.style.boxShadow='none'; e.target.style.background='rgba(255,255,255,0.08)'; }}
                />
              </div>
              {errors.mobile && <div style={{fontSize:11,color:'#FCA5A5',marginTop:5,fontWeight:500}}>{errors.mobile}</div>}
            </div>

            {/* Password */}
            <div style={{marginBottom:24}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7}}>
                <label style={labelStyle}>Password</label>
                <Link to="/forgot-password" style={{fontSize:11, color:'#A5B4FC', fontWeight:600, textDecoration:'none'}}>
                  Forgot?
                </Link>
              </div>
              <div style={{position:'relative'}}>
                <input
                  type={showPw?'text':'password'} placeholder="Enter password"
                  value={password} onChange={e => { setPassword(e.target.value); setErrors(p=>({...p,password:''})); }}
                  autoComplete="current-password"
                  style={{...inputBase(errors.password), paddingRight:44}}
                  onFocus={e => { e.target.style.borderColor='rgba(167,139,250,0.8)'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.2)'; e.target.style.background='rgba(255,255,255,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor=errors.password?'rgba(248,113,113,0.8)':'rgba(255,255,255,0.18)'; e.target.style.boxShadow='none'; e.target.style.background='rgba(255,255,255,0.08)'; }}
                />
                <button type="button" onClick={()=>setShowPw(s=>!s)}
                  style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', padding:4, display:'flex'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {showPw
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
              {errors.password && <div style={{fontSize:11,color:'#FCA5A5',marginTop:5,fontWeight:500}}>{errors.password}</div>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'14px',
              background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#6366F1,#4F46E5)',
              color:'#fff', border:'1px solid rgba(255,255,255,0.15)',
              borderRadius:13, fontSize:14.5, fontWeight:700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 6px 24px rgba(99,102,241,0.5)',
              transition:'all 0.2s ease', letterSpacing:'0.01em',
              backdropFilter:'blur(8px)',
            }}
              onMouseOver={e => { if(!loading){ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 10px 32px rgba(99,102,241,0.6)'; } }}
              onMouseOut={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=loading?'none':'0 6px 24px rgba(99,102,241,0.5)'; }}
            >
              {loading ? (
                <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <span style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.6s linear infinite'}} />
                  Signing in…
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <p style={{marginTop:24, fontSize:11, color:'rgba(255,255,255,0.25)', textAlign:'center', lineHeight:1.6}}>
            Avya Home Private Limited<br/>Real Estate CRM · Confidential
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float0 { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-55%) scale(1.05)} }
        @keyframes float1 { 0%,100%{transform:translate(-50%,-50%) scale(1.05)} 50%{transform:translate(-45%,-50%) scale(1)} }
        @keyframes float2 { 0%,100%{transform:translate(-50%,-50%)} 50%{transform:translate(-55%,-45%) scale(1.08)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* Tablet */
        @media (max-width: 820px) {
          .login-left { display: none !important; }
          .login-right {
            width: 100% !important; max-width: 100% !important;
            min-width: 0 !important; border-left: none !important;
            padding: 40px 32px !important;
          }
        }

        /* Small mobile */
        @media (max-width: 480px) {
          .login-right { padding: 32px 22px !important; }
        }

        /* Input autofill fix */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff !important;
          -webkit-box-shadow: 0 0 0 1000px rgba(30,27,75,0.8) inset !important;
          transition: background-color 9999s ease-in-out 0s;
          caret-color: #fff;
        }
      `}</style>
    </div>
  );
}
