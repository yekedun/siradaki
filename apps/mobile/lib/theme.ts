// Cool palette — single source of truth: ../../DESIGN.md + ../../Designs/tokens.css
// Earth tones banned (kullanıcı: 2026-05-07). Navy primary, red NOW/today, blue secondary.

export const T = {
  // Surfaces
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",

  // Lines
  line: "#E5E7EB",
  hairAlt: "#CBD5E1",

  // Text
  ink: "#111827",
  muted: "#6B7280",
  mutedAlt: "#9CA3AF",

  // Brand
  navy: "#1E3A8A",      // primary CTA / FAB
  blue: "#2563EB",      // secondary / link / service line
  blueSoft: "#EFF6FF",  // active chip / action bg

  // NOW / today / danger
  red: "#DC2626",
  redSoft: "#FEF2F2",
  redBorder: "#FECACA",

  // Timeline
  past: "#D1D5DB",
  blockInk: "#64748B",

  // Avatar gradient
  avatarFrom: "#DBEAFE",
  avatarTo: "#EFF6FF",

  // Legacy aliases — existing screens still reference these names
  accent: "#1E3A8A",
  accentSoft: "#EFF6FF",
  accentInk: "#1E3A8A",
  aptBg: "#FFFFFF",
  blockBg: "#F1F5F9",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
} as const;

export type ThemeTokens = typeof T;

export const R = {
  input: 10,
  card: 12,
  cta: 14,
  fab: 16,
  sheet: 24,
  pill: 9999,
} as const;

// iOS shadow recipes (Android falls back to `elevation`).
export const Shadow = {
  card: {
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pill: {
    shadowColor: "#111827",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cta: {
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  sheet: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -10 },
    elevation: 12,
  },
} as const;

// Berber pole stripe colors (mobil tarafta CSS yok, manuel View'larla çiziliyor)
export const POLE_COLORS = ["#DC2626", "#FFFFFF", "#2563EB", "#FFFFFF"] as const;
