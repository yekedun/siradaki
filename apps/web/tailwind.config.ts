import type { Config } from "tailwindcss";

// Source of truth: ../../DESIGN.md + Designs/tokens.css. Earth tones banned.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        surfaceAlt: "#F1F5F9",
        ink: "#111827",
        muted: "#6B7280",
        mutedAlt: "#9CA3AF",
        hair: "#E5E7EB",
        hairAlt: "#CBD5E1",
        past: "#D1D5DB",
        red: {
          DEFAULT: "#DC2626",
          soft: "#FEF2F2",
          border: "#FECACA",
        },
        blue: {
          DEFAULT: "#2563EB",
          soft: "#EFF6FF",
        },
        navy: "#1E3A8A",
        avatarFrom: "#DBEAFE",
        avatarTo: "#EFF6FF",
      },
      borderRadius: {
        input: "10px",
        card: "12px",
        cta: "14px",
        fab: "16px",
        sheet: "24px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,24,39,.04), 0 4px 8px rgba(17,24,39,.04)",
        pill: "0 6px 14px rgba(17,24,39,.18)",
        cta: "0 12px 28px rgba(30,58,138,.4), 0 4px 8px rgba(30,58,138,.2)",
        sheet: "0 -10px 40px rgba(15,23,42,.2)",
        now: "0 0 0 1px #1E3A8A, 0 2px 4px rgba(30,58,138,.3)",
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        eyebrow: "1.4px",
        eyebrowTight: "1.2px",
        title: "-0.5px",
      },
      keyframes: {
        pulse: {
          "0%": { boxShadow: "0 0 0 0 rgba(220,38,38,0.6)" },
          "70%": { boxShadow: "0 0 0 12px rgba(220,38,38,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(220,38,38,0)" },
        },
        "barber-scroll": {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "0 -48px" },
        },
      },
      animation: {
        pulse: "pulse 1.6s ease-out infinite",
        barber: "barber-scroll 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
