import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // bind mount z Windows do Dockeru nehlásí změny souborů, proto se soubory hlídají pollováním; výchozí interval 100 ms
    // dělal v kontejneru stálých 15 % CPU i bez otevřeného webu, sekundový interval stačí (změna se projeví do sekundy)
    watch: { usePolling: true, interval: 1000, binaryInterval: 3000 },
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3001' },
  },
})
