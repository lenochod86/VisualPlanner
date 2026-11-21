// Nastavení serveru z prostředí (viz docker-compose.yml).
export const config = {
  port: Number(process.env.PORT ?? 3001),
  dataDir: process.env.DATA_DIR ?? './data',
}
