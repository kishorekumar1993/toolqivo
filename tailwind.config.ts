import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#172554",
        },
        navy: {
          800: "#0F172A",
          900: "#0B132B",
          950: "#060C1E",
        },
        surface: {
          light: "#F8FAFC",
          cardLight: "#FFFFFF",
          borderLight: "#E2E8F0",
          tintLight: "#F0F7FF",
          dark: "#090E1A",
          cardDark: "#10192C",
          borderDark: "#1E2C4A",
          tintDark: "#13233E",
        },
        category: {
          pdf: "#EF4444",
          image: "#10B981",
          finance: "#3B82F6",
          calculator: "#8B5CF6",
          converter: "#F97316",
          country: "#EC4899",
          utility: "#14B8A6",
          ai: "#EAB308",
        },
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
        hover: "0 12px 28px -4px rgba(37, 99, 235, 0.08), 0 8px 16px -4px rgba(0, 0, 0, 0.03)",
        glow: "0 0 25px -5px rgba(37, 99, 235, 0.25)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-down": "slideDown 0.2s ease-out",
        "pulse-subtle": "pulseSubtle 3s infinite ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.95", transform: "scale(1.01)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
