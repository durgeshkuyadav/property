import Topbar from '../components/layout/Topbar';

const ComingSoon = ({ title, subtitle, phase, features }) => (
  <>
    <Topbar title={title} subtitle={subtitle} />
    <div className="page-body">
      <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ width: 56, height: 56, background: 'var(--goldl)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          Coming in {phase}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 20 }}>
          This page will be fully built in the next phase
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 8, maxWidth: 560, margin: '0 auto' }}>
          {features.map(f => (
            <div key={f} style={{ background: '#F4F4FA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--ink2)' }}>
              ✓ {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

// Only remaining placeholder — Phase 4 team payout (admin-specific detailed view)
export const TeamPayoutPage = () => (
  <ComingSoon
    title="Team Payout Report" subtitle="Detailed payout breakdown for your team"
    phase="Phase 4 — next sprint" features={['Member selector', 'Date range filter', 'Statement view', 'Team earnings chart']}
  />
);
