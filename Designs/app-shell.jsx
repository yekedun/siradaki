/* Shared helpers for all owner/customer screens */
const { useState, useEffect, useMemo } = React;

const TR_DAY = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
const TR_MONTH = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

const inputStyle = {
  width: '100%', padding: '12px 14px',
  background: 'var(--bg)', border: '1.5px solid var(--hair)',
  borderRadius: 'var(--r-input)', fontSize: 14, color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, display: 'block',
};

function PageHeader({ eyebrow, title, sub }) {
  return (
    <div style={{ padding: '64px 20px 8px' }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>
      <h1 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>{title}</h1>
      {sub && <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

function PrimaryCTA({ children, onClick, disabled, full = true }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: full ? '100%' : 'auto', padding: 16,
      background: disabled ? 'var(--surfaceAlt)' : 'var(--navy)',
      color: disabled ? 'var(--mutedAlt)' : '#fff',
      border: 'none', borderRadius: 'var(--r-fab)',
      fontSize: 15, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : 'var(--shadow-cta)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>{children}</button>
  );
}

function DangerButton({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '12px 14px', background: 'var(--redSoft)', color: 'var(--red)',
      border: '1px solid var(--redBorder)', borderRadius: 'var(--r-card)',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
    }}>{children}</button>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--hair)',
      borderRadius: 'var(--r-card)', boxShadow: 'var(--shadow-card)',
      padding: 14, ...style,
    }}>{children}</div>
  );
}

function Avatar({ initials, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: 'linear-gradient(135deg, var(--avatarFrom), var(--avatarTo))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, color: 'var(--navy)', fontSize: size * 0.4, flex: '0 0 auto',
    }}>{initials}</div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      background: 'var(--bg)', borderTop: '1px solid var(--hair)',
      paddingTop: 8, paddingBottom: 28,
      display: 'flex', justifyContent: 'space-around',
    }}>
      {tabs.map(t => {
        const sel = t.id === active;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, padding: '6px 8px', background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            color: sel ? 'var(--navy)' : 'var(--muted)',
          }}>
            {t.icon}
            <div style={{ fontSize: 11, fontWeight: sel ? 700 : 500 }}>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}

const ICN = {
  dash: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="7" height="9" rx="1.5" stroke={c} strokeWidth="1.7"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5" stroke={c} strokeWidth="1.7"/><rect x="3.5" y="15.5" width="7" height="5" rx="1.5" stroke={c} strokeWidth="1.7"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5" stroke={c} strokeWidth="1.7"/></svg>,
  cal: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke={c} strokeWidth="1.7"/><path d="M8 3v4M16 3v4M3.5 10h17" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>,
  team: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="9" r="3.5" stroke={c} strokeWidth="1.7"/><path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={c} strokeWidth="1.7" strokeLinecap="round"/><circle cx="17" cy="8" r="2.5" stroke={c} strokeWidth="1.7"/><path d="M16 13.5c2.5.4 4.5 2.5 4.5 5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>,
  gear: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.7"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7 2 2 0 1 1-2.8 2.8 1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0 1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3 2 2 0 1 1-2.8-2.8 1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7 2 2 0 1 1 2.8-2.8 1.6 1.6 0 0 0 1.7.3 1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0 1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3 2 2 0 1 1 2.8 2.8 1.6 1.6 0 0 0-.3 1.7v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/></svg>,
  home: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3.5 11l8.5-7 8.5 7v8.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V11z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/><path d="M9.5 21V14h5v7" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>,
  user: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.5" stroke={c} strokeWidth="1.7"/><path d="M4.5 20c0-4 3.4-7 7.5-7s7.5 3 7.5 7" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>,
  block: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke={c} strokeWidth="1.7"/><path d="M6.5 6.5l11 11" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>,
  chev: (c) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  back: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 6l-6 6 6 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check: (c) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L7 12L13 4.5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function NavTopBar({ title, onBack, step }) {
  return (
    <div style={{
      padding: '52px 16px 12px', display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--bg)', borderBottom: '1px solid var(--hair)',
    }}>
      <button onClick={onBack} style={{
        width: 36, height: 36, borderRadius: 18,
        background: 'var(--surface)', border: '1px solid var(--hair)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flex: '0 0 auto',
      }}>{ICN.back('#111827')}</button>
      <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{title}</div>
      {step ? (
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)',
          background: 'var(--blueSoft)', padding: '4px 10px', borderRadius: 100,
          letterSpacing: 0.5 }}>{step}</div>
      ) : <div style={{ width: 36 }} />}
    </div>
  );
}

function Stepper({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '14px 20px 6px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: i < current ? 'var(--navy)' : 'var(--hair)',
        }} />
      ))}
    </div>
  );
}
