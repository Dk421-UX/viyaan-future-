import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        accent: '#c9a87c',
        card: '#0f0f12',
        border: '#26262a',
        muted: '#71717a',
      },
    },
  },
  plugins: [],
}
export default config
