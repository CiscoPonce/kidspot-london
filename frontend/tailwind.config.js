/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        "on-tertiary-fixed": "#001f23",
        "success-green": "#8DC572",
        "on-secondary-fixed": "#1b1b1b",
        "secondary-brand": "#5e5e5e",
        "renault-yellow": "#EFDF00",
        "renault-blue": "#1883FD",
        "on-secondary-fixed-variant": "#474747",
        "secondary-fixed-dim": "#c6c6c6",
        "surface-variant": "#e8e3cf",
        "on-surface": "#1d1c10",
        "surface-container": "#f3eeda",
        "on-primary-fixed-variant": "#4e4800",
        "inverse-on-surface": "#f6f1dd",
        "surface-container-high": "#ede8d5",
        "surface-bright": "#fff9e6",
        "on-secondary": "#ffffff",
        "on-primary": "#ffffff",
        "on-error": "#ffffff",
        "on-surface-variant": "#4a4732",
        "error": "#ba1a1a",
        "pure-white": "#FFFFFF",
        "primary-brand": "#676000",
        "error-container": "#ffdad6",
        "on-secondary-container": "#646464",
        "warm-gray": "#D9D9D6",
        "inverse-surface": "#333124",
        "on-primary-fixed": "#1f1c00",
        "tertiary-fixed-dim": "#42d9e9",
        "background-brand": "#fff9e6",
        "charcoal": "#222222",
        "tertiary-container": "#5fefff",
        "surface-container-highest": "#e8e3cf",
        "secondary-fixed": "#e2e2e2",
        "on-primary-container": "#696200",
        "tertiary": "#006972",
        "outline": "#7b785f",
        "pale-silver": "#F2F2F2",
        "tertiary-fixed": "#8af2ff",
        "error-rose": "#BE6464",
        "surface-container-lowest": "#ffffff",
        "outline-variant": "#ccc7ab",
        "surface-tint": "#676000",
        "on-tertiary": "#ffffff",
        "surface-dim": "#dfdac7",
        "surface-container-low": "#f9f4e0",
        "border-gray": "#D1D1D1",
        "absolute-black": "#000000",
        "inverse-primary": "#d8ca00",
        "surface": "#fff9e6",
        "on-tertiary-container": "#006b74",
        "on-tertiary-fixed-variant": "#004f56",
        "info-blue": "#337AB7",
        "on-background": "#1d1c10",
        "primary-fixed-dim": "#d8ca00",
        "primary-fixed": "#f6e614",
        "soft-yellow": "#F8EB4C",
        "secondary-container": "#e2e2e2",
        "primary-container": "#efdf00",
        "warning-amber": "#F0AD4E",
        "on-error-container": "#93000a",
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        "touch-target-min": "46px",
        "button-y": "10px",
        "base": "8px",
        "grid-gap": "24px",
        "card-padding": "32px",
        "section-gap": "80px",
        "button-x": "15px"
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        "section-heading": ["Space Grotesk"],
        "nav-link": ["Space Grotesk"],
        "button-label": ["Space Grotesk"],
        "body-bold": ["Inter"],
        "card-heading": ["Space Grotesk"],
        "body-text": ["Inter"],
        "micro-text": ["Inter"],
        "hero-title": ["Space Grotesk"],
        "module-title": ["Space Grotesk"]
      },
      fontSize: {
        "section-heading": [
          "40px",
          {
            "lineHeight": "0.95",
            "fontWeight": "700"
          }
        ],
        "nav-link": [
          "13px",
          {
            "lineHeight": "1.50",
            "fontWeight": "700"
          }
        ],
        "button-label": [
          "16px",
          {
            "lineHeight": "1.00",
            "letterSpacing": "0.144px",
            "fontWeight": "700"
          }
        ],
        "body-bold": [
          "14px",
          {
            "lineHeight": "1.57",
            "fontWeight": "700"
          }
        ],
        "card-heading": [
          "32px",
          {
            "lineHeight": "0.95",
            "fontWeight": "700"
          }
        ],
        "body-text": [
          "14px",
          {
            "lineHeight": "1.40",
            "fontWeight": "400"
          }
        ],
        "micro-text": [
          "10px",
          {
            "lineHeight": "1.45",
            "fontWeight": "700"
          }
        ],
        "hero-title": [
          "56px",
          {
            "lineHeight": "0.95",
            "fontWeight": "700"
          }
        ],
        "module-title": [
          "21.92px",
          {
            "lineHeight": "1.20",
            "fontWeight": "600"
          }
        ]
      }
    },
  },
  plugins: [],
};
