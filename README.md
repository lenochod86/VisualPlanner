# Visual Planner

Webový plánovač bytu/domu: půdorys (2D) + 3D vizualizace.

## Spuštění (Docker)

    docker compose up --build        # dev server s HMR: http://localhost:5173
    docker compose --profile prod up --build prod   # produkční build v nginx: http://localhost:8080

## Stack
Vite + React + TypeScript, Zustand (stav, ukládání do localStorage), SVG pro 2D editor,
three.js přes react-three-fiber/drei pro 3D, Vitest. Jednotky: cm.

## Roadmapa
1. [x] Půdorys: obdélník, L levé/pravé, tažení stěn, zadání rozměru u stěny
2. [x] 3D, překážky (stoupačka, topení, okno, dveře), přichytávání ke stěně
3. [ ] Nábytek + katalog (WC, geberit, sprcha, vana, umyvadlo, TV, stůl, linka, gauč, postel), snap ke zdi
4. [ ] Celý byt: sdílené stěny, otvory ve zdech (CSG), materiály, stropy, SDK strop s rastrem profilů
5. [ ] Elektro: zásuvky, světla, kabely (parametry, trasy), auto-trasování, zobrazení v konstrukcích
6. [ ] Backend (Fastify + Postgres) pro ukládání projektů, export/import JSON
