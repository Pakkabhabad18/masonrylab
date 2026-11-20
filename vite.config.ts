import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// React plugin for JSX, Tailwind v4 plugin for utility classes
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
