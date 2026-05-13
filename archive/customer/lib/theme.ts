// Tek kaynak: ../../DESIGN.md + ../../Designs/tokens.css
// Earth tones yasak. Navy primary, red danger/NOW, blue secondary.

export const T = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",

  line: "#E5E7EB",
  hairAlt: "#CBD5E1",

  ink: "#111827",
  muted: "#6B7280",
  mutedAlt: "#9CA3AF",

  navy: "#1E3A8A",
  blue: "#2563EB",
  blueSoft: "#EFF6FF",

  red: "#DC2626",
  redSoft: "#FEF2F2",
  redBorder: "#FECACA",

  avatarFrom: "#DBEAFE",
  avatarTo: "#EFF6FF",
} as const;

export const R = {
  input: 10,
  card: 12,
  cta: 14,
  fab: 16,
  pill: 9999,
} as const;

export const Shadow = {
  card: {
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
