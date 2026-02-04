/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        minecraft: ['VT323', 'monospace'],
      },
      colors: {
        // Minecraft dark theme - stone/obsidian inspired
        background: 'hsl(220, 15%, 12%)',
        foreground: 'hsl(40, 20%, 90%)',
        card: 'hsl(220, 12%, 16%)',
        'card-foreground': 'hsl(40, 20%, 90%)',
        popover: 'hsl(220, 12%, 14%)',
        'popover-foreground': 'hsl(40, 20%, 90%)',
        // Minecraft grass green
        primary: 'hsl(100, 50%, 45%)',
        'primary-foreground': 'hsl(0, 0%, 100%)',
        // Stone gray
        secondary: 'hsl(220, 10%, 25%)',
        'secondary-foreground': 'hsl(40, 20%, 90%)',
        // Darker stone
        muted: 'hsl(220, 10%, 20%)',
        'muted-foreground': 'hsl(40, 10%, 60%)',
        // Gold/enchanted accent
        accent: 'hsl(45, 100%, 50%)',
        'accent-foreground': 'hsl(220, 15%, 12%)',
        // Redstone red
        destructive: 'hsl(0, 70%, 50%)',
        'destructive-foreground': 'hsl(0, 0%, 100%)',
        // Minecraft UI borders
        border: 'hsl(220, 10%, 30%)',
        input: 'hsl(220, 12%, 20%)',
        ring: 'hsl(100, 50%, 45%)',
        // Legacy AQ colors (for compatibility)
        aq: {
          bg: "#050816",
          panel: "#0b1020",
          border: "#20263a",
          text: "#f5f7ff",
          muted: "#a0a5c5",
          accent: "#4f46e5",
        },
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.7)",
      },
    },
  },
  plugins: [],
};

