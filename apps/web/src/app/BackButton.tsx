'use client';

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      style={{
        height: 48, padding: '0 24px', borderRadius: 12,
        border: '1.5px solid var(--border)', background: 'transparent',
        color: 'var(--fg-2)', fontFamily: 'inherit', fontWeight: 600, fontSize: 15,
        cursor: 'pointer', transition: 'border-color 140ms, transform 120ms',
      }}
    >
      Geri Dön
    </button>
  );
}
