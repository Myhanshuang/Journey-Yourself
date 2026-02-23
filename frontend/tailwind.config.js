/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"], // Assuming Inter or system font
      },
      // Responsive typography scaling
      fontSize: {
        // Mobile sizes (default)
        'h1-mobile': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em', fontWeight: '900' }], // 24px
        'h2-mobile': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '800' }], // 20px
        'h3-mobile': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '700' }], // 18px
        
        // Desktop sizes (via md: prefix)
        'h1-desktop': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '900' }], // 36px
        'h2-desktop': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em', fontWeight: '800' }], // 30px
        'h3-desktop': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }], // 24px
      }
    },
  },
  plugins: [],
}
