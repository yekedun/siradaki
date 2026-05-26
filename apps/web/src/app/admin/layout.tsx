export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#1E3A8A', color: '#fff', padding: '12px 24px', fontSize: 14, fontWeight: 600 }}>
        Sıradaki Admin
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
        {children}
      </div>
    </div>
  );
}
