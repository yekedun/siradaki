/* Berber - Randevu Agenda */
const { useState, useEffect, useRef, useMemo } = React;

// Palette
const C = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  ink: '#111827',
  mute: '#6B7280',
  hair: '#E5E7EB',
  past: '#D1D5DB',
  red: '#DC2626',
  blue: '#2563EB',
  navy: '#1E3A8A',
};

// ─────────────────────────────────────────────────────────────
// Utility — date strip
// ─────────────────────────────────────────────────────────────
const TR_DAY_SHORT = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
const TR_MONTH = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

function buildWeek(centerDate) {
  // Monday-start week
  const d = new Date(centerDate);
  const day = (d.getDay() + 6) % 7; // 0 = Mon
  d.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x;
  });
}
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// ─────────────────────────────────────────────────────────────
// Sample data (today, Çarşamba)
// ─────────────────────────────────────────────────────────────
// Times are HH:MM strings, and durations in minutes.
const todayAppointments = [
  { id: 1, time: '09:00', dur: 30, name: 'Ahmet Yılmaz',  service: 'Sakal Tıraşı',          status: 'done' },
  { id: 2, time: '09:45', dur: 45, name: 'Mehmet Demir',  service: 'Saç Kesimi + Yıkama',   status: 'done' },
  { id: 3, time: '10:45', dur: 30, name: 'Burak Aslan',   service: 'Saç Kesimi',            status: 'done' },
  { id: 4, time: '11:30', dur: 30, name: 'Emre Kaya',     service: 'Sakal Şekillendirme',   status: 'done' },
  { id: 5, time: '12:30', dur: 60, status: 'block', label: 'ÖĞLE ARASI' },
  { id: 6, time: '13:45', dur: 45, name: 'Cem Polat',     service: 'Saç Kesimi - 45dk',     status: 'upcoming' },
  { id: 7, time: '14:45', dur: 30, name: 'Hakan Şahin',   service: 'Sakal Tıraşı - 30dk',   status: 'upcoming' },
  { id: 8, time: '15:30', dur: 60, name: 'Selim Doğan',   service: 'Saç + Sakal - 60dk',    status: 'upcoming' },
  { id: 9, time: '16:45', dur: 30, name: 'Tolga Arı',     service: 'Saç Kesimi - 30dk',     status: 'upcoming' },
  { id: 10, time: '17:30', dur: 45, name: 'Murat Kılıç',  service: 'Saç + Yıkama - 45dk',   status: 'upcoming' },
  { id: 11, time: '18:30', dur: 30, name: 'Ali Can',      service: 'Sakal Şekillendirme - 30dk', status: 'upcoming' },
];

// "Now" simulated at 13:12 — between block end (13:30) — let's set 13:18
// Actually the spec divides past/future by "now" line; we'll compute insertion.
const NOW_TIME = '13:18';

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────
function Header({ today, selected, onSelect }) {
  const week = buildWeek(today);
  const dateLabel = `${today.getDate()} ${TR_MONTH[today.getMonth()]} ${today.getFullYear()}, ${TR_DAY_SHORT[today.getDay()]}`;

  return (
    <div style={{
      paddingTop: 56,
      paddingBottom: 12,
      background: C.bg,
      borderBottom: `1px solid ${C.hair}`,
    }}>
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{
          fontSize: 11, letterSpacing: 1.4, fontWeight: 600,
          color: C.red, textTransform: 'uppercase', marginBottom: 4,
        }}>
          BERBER · DÜKKAN PANELİ
        </div>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
        }}>
          <h1 style={{
            margin: 0, fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: -0.5,
          }}>Randevular</h1>
          <div style={{ fontSize: 12, color: C.mute, fontWeight: 500 }}>{dateLabel}</div>
        </div>
      </div>

      {/* Date strip */}
      <div style={{
        display: 'flex', gap: 8, padding: '0 20px 4px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {week.map((d, i) => {
          const isSel = sameDay(d, selected);
          const isToday = sameDay(d, today);
          return (
            <button
              key={i}
              onClick={() => onSelect(d)}
              style={{
                flex: '0 0 auto',
                width: 48, height: 64, borderRadius: 14,
                border: isToday && !isSel ? `1.5px solid ${C.red}` : `1px solid ${isSel ? C.ink : C.hair}`,
                background: isSel ? C.ink : C.surface,
                color: isSel ? '#fff' : C.ink,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                boxShadow: isSel ? '0 6px 14px rgba(17,24,39,0.18)' : 'none',
              }}
            >
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
                color: isSel ? 'rgba(255,255,255,0.7)' : C.mute,
                textTransform: 'uppercase', marginBottom: 2,
              }}>{TR_DAY_SHORT[d.getDay()]}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{d.getDate()}</div>
              {isToday && (
                <div style={{
                  width: 4, height: 4, borderRadius: 4, marginTop: 3,
                  background: isSel ? '#fff' : C.red,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Now indicator — pulse
// ─────────────────────────────────────────────────────────────
function NowRow({ time }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '52px 28px 1fr',
      alignItems: 'center',
      position: 'relative',
      minHeight: 28,
    }}>
      {/* Time label */}
      <div style={{
        textAlign: 'right', paddingRight: 10,
        fontSize: 12, fontWeight: 700, color: C.red,
        fontVariantNumeric: 'tabular-nums',
      }}>{time}</div>

      {/* Pulse dot */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <div className="pulse-dot" />
      </div>

      {/* Red line */}
      <div style={{
        height: 2, background: C.red, borderRadius: 2, marginRight: 18,
        boxShadow: `0 0 0 0.5px ${C.red}`,
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────────────────────
function DoneCard({ a }) {
  return (
    <div style={{
      padding: '10px 14px 10px 0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#9CA3AF',
          textDecoration: 'line-through', textDecorationColor: 'rgba(156,163,175,0.4)',
          textDecorationThickness: '1px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{a.name}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
          {a.service} · {a.dur}dk
        </div>
      </div>
      {/* check */}
      <div style={{
        flex: '0 0 auto',
        width: 18, height: 18, borderRadius: 9,
        background: '#E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function UpcomingCard({ a, onTap }) {
  return (
    <button
      onClick={onTap}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        background: C.surface,
        border: `1px solid ${C.hair}`,
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 4px 8px rgba(17,24,39,0.04)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      {/* avatar initial */}
      <div style={{
        flex: '0 0 auto',
        width: 36, height: 36, borderRadius: 10,
        background: 'linear-gradient(135deg, #DBEAFE, #EFF6FF)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: C.navy,
      }}>{a.name.split(' ').map(s => s[0]).join('').slice(0,2)}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: C.ink,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{a.name}</div>
        <div style={{ fontSize: 12, color: C.blue, marginTop: 2, fontWeight: 500 }}>
          {a.service}
        </div>
      </div>

      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 4,
        color: C.mute,
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

function BlockCard({ a }) {
  return (
    <div style={{
      padding: '14px',
      background: '#F1F5F9',
      borderRadius: 12,
      border: '1px dashed #CBD5E1',
      textAlign: 'center',
      letterSpacing: 2,
      fontSize: 12, fontWeight: 700, color: '#64748B',
      textTransform: 'uppercase',
    }}>
      {a.label} · {a.dur}dk
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Row — [time] [dot in track] [card]
// ─────────────────────────────────────────────────────────────
function Row({ a, isFirst, isLast, position }) {
  // position: 'past' | 'future' | 'block-future' (block can be either)
  const time = a.time;
  const dotKind = a.status === 'block' ? 'square' : (position === 'past' ? 'gray' : 'navy');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '52px 28px 1fr',
      alignItems: 'stretch',
      paddingTop: isFirst ? 6 : 0,
    }}>
      {/* time column */}
      <div style={{
        textAlign: 'right', paddingRight: 10, paddingTop: 12,
        fontSize: 12, color: position === 'past' ? '#9CA3AF' : C.ink,
        fontWeight: position === 'past' ? 500 : 600,
        fontVariantNumeric: 'tabular-nums',
      }}>{time}</div>

      {/* track + dot */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {/* dot */}
        <div style={{
          position: 'absolute', top: 16, zIndex: 2,
          ...(dotKind === 'gray' ? {
            width: 10, height: 10, borderRadius: 10, background: C.past,
            border: `2px solid ${C.bg}`,
          } : dotKind === 'navy' ? {
            width: 14, height: 14, borderRadius: 14, background: C.navy,
            border: `3px solid #fff`,
            boxShadow: `0 0 0 1px ${C.navy}, 0 2px 4px rgba(30,58,138,0.3)`,
          } : {
            width: 12, height: 12, borderRadius: 3, background: '#94A3B8',
            border: `2px solid ${C.bg}`,
            transform: 'rotate(45deg)',
          })
        }} />
      </div>

      {/* card */}
      <div style={{ paddingBottom: 14, paddingRight: 14 }}>
        {a.status === 'done' && <DoneCard a={a} />}
        {a.status === 'upcoming' && <UpcomingCard a={a} />}
        {a.status === 'block' && <BlockCard a={a} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Agenda — renders timeline column + rows + now
// ─────────────────────────────────────────────────────────────
function Agenda({ items, nowTime }) {
  // partition by time
  const idxNow = items.findIndex(a => a.time >= nowTime);
  const past = idxNow === -1 ? items : items.slice(0, idxNow);
  const future = idxNow === -1 ? [] : items.slice(idxNow);

  // Block items need special treatment: if a block is in the past partition
  // we still consider it past for dot color, etc. handled by `time >= nowTime`.

  return (
    <div style={{ position: 'relative' }}>
      {/* Background tracks (gray past, barber pole future) */}
      <div style={{
        position: 'absolute',
        left: 52 + 14 - 2, // center of dot column (52 + 28/2 - 4/2)
        top: 0, bottom: 0, width: 4,
        pointerEvents: 'none',
      }}>
        {/* Past portion: gray solid */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: `var(--past-h, 50%)`,
          background: C.past,
          borderRadius: 2,
        }} />
        {/* Future portion: barber pole */}
        <div className="barber-pole" style={{
          position: 'absolute', left: 0, right: 0,
          top: `var(--past-h, 50%)`, bottom: 0,
          borderRadius: 2,
          opacity: 0.55,
        }} />
      </div>

      {/* Past rows */}
      {past.map((a, i) => (
        <Row key={a.id} a={a} position="past"
             isFirst={i === 0} isLast={i === past.length - 1} />
      ))}

      {/* Now indicator */}
      {idxNow !== -1 && <NowRow time={nowTime} />}

      {/* Future rows */}
      {future.map((a, i) => (
        <Row key={a.id} a={a} position="future"
             isFirst={i === 0} isLast={i === future.length - 1} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// New Appointment Sheet
// ─────────────────────────────────────────────────────────────
function NewSheet({ open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('Saç Kesimi');
  const [time, setTime] = useState('19:00');
  const [dur, setDur] = useState(30);

  useEffect(() => {
    if (open) { setName(''); setPhone(''); setService('Saç Kesimi'); setTime('19:00'); setDur(30); }
  }, [open]);

  const services = [
    { name: 'Saç Kesimi', dur: 30 },
    { name: 'Sakal Tıraşı', dur: 20 },
    { name: 'Saç + Sakal', dur: 60 },
    { name: 'Yıkama', dur: 15 },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 30,
        background: 'rgba(15,23,42,0.45)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s ease',
      }} />
      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
        background: C.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 0.28s cubic-bezier(.4,.0,.2,1)',
        boxShadow: '0 -10px 40px rgba(15,23,42,0.2)',
        paddingBottom: 24,
        maxHeight: '78%', overflow: 'auto',
      }}>
        {/* Grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: '#E5E7EB' }} />
        </div>

        <div style={{ padding: '6px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.ink }}>Yeni Randevu</h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: C.mute, fontSize: 14,
            fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>İptal</button>
        </div>

        <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Müşteri Adı">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="örn. Ahmet Yılmaz"
              style={inputStyle} />
          </Field>
          <Field label="Telefon">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0(5xx) xxx xx xx"
              style={inputStyle} />
          </Field>

          <Field label="Hizmet">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {services.map(s => {
                const sel = service === s.name;
                return (
                  <button key={s.name} onClick={() => { setService(s.name); setDur(s.dur); }}
                    style={{
                      padding: '12px 10px', borderRadius: 10,
                      border: `1.5px solid ${sel ? C.navy : C.hair}`,
                      background: sel ? '#EFF6FF' : '#fff',
                      cursor: 'pointer', fontFamily: 'inherit',
                      textAlign: 'left',
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: sel ? C.navy : C.ink }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>{s.dur} dk</div>
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Saat">
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                style={inputStyle} />
            </Field>
            <Field label="Süre">
              <select value={dur} onChange={e => setDur(+e.target.value)} style={inputStyle}>
                <option value={15}>15 dakika</option>
                <option value={30}>30 dakika</option>
                <option value={45}>45 dakika</option>
                <option value={60}>60 dakika</option>
                <option value={90}>90 dakika</option>
              </select>
            </Field>
          </div>

          <button onClick={() => onSave({ name: name || 'Yeni Müşteri', service: `${service} - ${dur}dk`, time, dur })}
            style={{
              marginTop: 6,
              width: '100%', padding: '14px',
              background: C.navy, color: '#fff',
              border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 8px 18px rgba(30,58,138,0.3)',
            }}>
            Randevuyu Kaydet
          </button>
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: '#F8FAFC',
  border: `1.5px solid ${C.hair}`,
  borderRadius: 10,
  fontSize: 14, color: C.ink,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.mute,
        textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
// Detail Sheet (tap upcoming card)
// ─────────────────────────────────────────────────────────────
function DetailSheet({ appt, onClose }) {
  const open = !!appt;
  const a = appt || {};
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 30,
        background: 'rgba(15,23,42,0.45)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s ease',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
        background: C.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 0.28s cubic-bezier(.4,.0,.2,1)',
        boxShadow: '0 -10px 40px rgba(15,23,42,0.2)',
        paddingBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: '#E5E7EB' }} />
        </div>
        <div style={{ padding: '8px 20px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {a.time} · {a.dur}dk
          </div>
          <h2 style={{ margin: '4px 0 2px', fontSize: 24, fontWeight: 700, color: C.ink }}>{a.name}</h2>
          <div style={{ fontSize: 14, color: C.mute }}>{a.service}</div>
        </div>

        <div style={{ padding: '14px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { lbl: 'Ara', icon: '📞', tone: C.navy, bg: '#EFF6FF' },
            { lbl: 'Mesaj', icon: '💬', tone: C.blue, bg: '#EFF6FF' },
            { lbl: 'Düzenle', icon: '✎', tone: C.ink, bg: '#F1F5F9' },
          ].map((b, i) => (
            <button key={i} style={{
              padding: '12px 8px', background: b.bg, border: 'none', borderRadius: 12,
              fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <div style={{ fontSize: 18 }}>{b.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: b.tone }}>{b.lbl}</div>
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 20px', display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', background: '#FEF2F2', color: C.red,
            border: '1px solid #FECACA', borderRadius: 12,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>İptal Et</button>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', background: C.navy, color: '#fff',
            border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>Tamamlandı</button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────
function App() {
  const today = useMemo(() => new Date(2026, 4, 7), []); // 7 Mayıs 2026, Perşembe
  const [selected, setSelected] = useState(today);
  const [items, setItems] = useState(todayAppointments);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const trackRef = useRef(null);

  // Compute past-track height as % of timeline (for the gray segment).
  // We measure after layout — pick the row containing now and use its top.
  useEffect(() => {
    const el = document.getElementById('agenda-scroll');
    if (!el) return;
    const measure = () => {
      const wrap = el.querySelector('[data-track-wrap]');
      if (!wrap) return;
      const nowEl = el.querySelector('[data-now-row]');
      if (!nowEl) return;
      const wb = wrap.getBoundingClientRect();
      const nb = nowEl.getBoundingClientRect();
      const pct = ((nb.top + nb.height/2) - wb.top) / wb.height * 100;
      wrap.style.setProperty('--past-h', `${Math.max(0, Math.min(100, pct))}%`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, selected]);

  const handleSave = (a) => {
    const newItem = {
      id: Date.now(),
      ...a,
      status: 'upcoming',
    };
    setItems(prev => [...prev, newItem].sort((x, y) => x.time.localeCompare(y.time)));
    setSheetOpen(false);
  };

  // For non-today selections, show empty/available state
  const isToday = sameDay(selected, today);
  const displayItems = isToday ? items : [];

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: C.bg, color: C.ink,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      <Header today={today} selected={selected} onSelect={setSelected} />

      <div id="agenda-scroll" style={{
        flex: 1, overflow: 'auto', paddingBottom: 100, paddingTop: 6,
      }}>
        {displayItems.length > 0 ? (
          <AgendaWithMarkers items={displayItems} nowTime={NOW_TIME} onTap={setDetail} />
        ) : (
          <EmptyDay date={selected} />
        )}
      </div>

      {/* FAB */}
      <div style={{
        position: 'absolute', left: 16, right: 16, bottom: 24, zIndex: 20,
      }}>
        <button onClick={() => setSheetOpen(true)} style={{
          width: '100%', padding: '16px',
          background: C.navy, color: '#fff',
          border: 'none', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: '0 12px 28px rgba(30,58,138,0.4), 0 4px 8px rgba(30,58,138,0.2)',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3.5v11M3.5 9h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Yeni Randevu
        </button>
      </div>

      <NewSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={handleSave} />
      <DetailSheet appt={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// Variant of Agenda that uses data attrs for measurement
function AgendaWithMarkers({ items, nowTime, onTap }) {
  const idxNow = items.findIndex(a => a.time >= nowTime);
  const past = idxNow === -1 ? items : items.slice(0, idxNow);
  const future = idxNow === -1 ? [] : items.slice(idxNow);

  return (
    <div data-track-wrap style={{ position: 'relative' }}>
      {/* Tracks */}
      <div style={{
        position: 'absolute',
        left: 52 + 14 - 2,
        top: 16, bottom: 16, width: 4,
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 'var(--past-h, 50%)',
          background: C.past,
          borderRadius: 2,
        }} />
        <div className="barber-pole" style={{
          position: 'absolute', left: 0, right: 0,
          top: 'var(--past-h, 50%)', bottom: 0,
          borderRadius: 2,
          opacity: 0.45,
        }} />
      </div>

      {past.map((a, i) => (
        <RowTap key={a.id} a={a} position="past" onTap={onTap} />
      ))}

      {idxNow !== -1 && (
        <div data-now-row>
          <NowRow time={nowTime} />
        </div>
      )}

      {future.map((a, i) => (
        <RowTap key={a.id} a={a} position="future" onTap={onTap} />
      ))}

      {/* End cap */}
      <div style={{ height: 20 }} />
    </div>
  );
}

function RowTap({ a, position, onTap }) {
  const dotKind = a.status === 'block' ? 'square' : (position === 'past' ? 'gray' : 'navy');
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '52px 28px 1fr',
      alignItems: 'stretch',
    }}>
      <div style={{
        textAlign: 'right', paddingRight: 10, paddingTop: 12,
        fontSize: 12, color: position === 'past' ? '#9CA3AF' : C.ink,
        fontWeight: position === 'past' ? 500 : 600,
        fontVariantNumeric: 'tabular-nums',
      }}>{a.time}</div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', top: 16, zIndex: 2,
          ...(dotKind === 'gray' ? {
            width: 10, height: 10, borderRadius: 10, background: C.past,
            border: `2px solid ${C.bg}`,
          } : dotKind === 'navy' ? {
            width: 14, height: 14, borderRadius: 14, background: C.navy,
            border: `3px solid #fff`,
            boxShadow: `0 0 0 1px ${C.navy}, 0 2px 4px rgba(30,58,138,0.3)`,
          } : {
            width: 12, height: 12, borderRadius: 3, background: '#94A3B8',
            border: `2px solid ${C.bg}`,
            transform: 'rotate(45deg)',
          })
        }} />
      </div>

      <div style={{ paddingBottom: 12, paddingRight: 14, paddingTop: 4 }}>
        {a.status === 'done' && <DoneCard a={a} />}
        {a.status === 'upcoming' && <UpcomingCard a={a} onTap={() => onTap && onTap(a)} />}
        {a.status === 'block' && <BlockCard a={a} />}
      </div>
    </div>
  );
}

function EmptyDay({ date }) {
  return (
    <div style={{
      padding: '60px 28px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 32,
        background: '#F1F5F9', margin: '0 auto 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28,
      }}>📅</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
        Henüz randevu yok
      </div>
      <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.5 }}>
        {date.getDate()} {TR_MONTH[date.getMonth()]} için randevu bulunmuyor.
        Yeni Randevu butonuna basarak ekleyebilirsiniz.
      </div>
    </div>
  );
}

window.BerberApp = App;
