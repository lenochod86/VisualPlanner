# Visual Planner

Webový plánovač bytu/domu: půdorys (2D) + 3D vizualizace. Jednotky: cm.

## Spuštění (Docker)

    docker compose up --build                                   # dev, http://localhost:5173 (API :3001)
    docker compose --profile prod up --build web-prod api-prod  # produkce, http://localhost:8080

Projekt se ukládá na server do `./data/<id>.json` (není v gitu). Testy: `docker compose run --rm web npm test`, `docker compose run --rm api npm test`.

## Struktura

    web/                      frontend (Vite + React + TypeScript)
      src/config.ts           ladicí konstanty (mřížka, magnet, minima)
      src/domain/             datový model (types), katalog místností/překážek, výchozí projekt + validace
      src/geometry/           čistá geometrie bez Reactu a bez stavu (+ testy)
        polygon.ts            plocha, těžiště, stěny, změna délky/pozice stěny
        magnet.ts             přichytávání místností k sousedům (sdílená zeď)
        walls.ts              model zdí: sdílené zdi, tloušťky, vnější obrys
        obstacles.ts          poloha překážek připnutých ke stěně
      src/store/              Zustand: projectStore (data), uiStore (výběr, nástroj), history (undo/redo)
      src/api/                klient REST API
      src/features/
        plan2d/               2D editor: viewport, tažení, vykreslení místností/překážek
        view3d/               3D scéna (react-three-fiber)
        sidebar/              panely: přidávání, vlastnosti, přehled bytu, soubor
        persistence/          načtení + automatické ukládání na server
    server/                   backend (Fastify + TypeScript)
      src/routes/             HTTP routy (jen validace vstupu a volání služby)
      src/services/           aplikační logika
      src/storage/            úložiště za rozhraním ProjectRepository (soubory, paměť pro testy)

Závislosti míří jedním směrem: `features → store → geometry/domain`; `routes → services → storage`.

## Roadmapa
1. [x] Půdorys: obdélník, L levé/pravé, tažení stěn, rozměr u každé stěny
2. [x] 3D, překážky (stoupačka, topení, okno, dveře)
3. [x] Celý byt: kreslení místností, magnet / sdílená zeď, přehled ploch, ukládání na server, export/import
   - [x] Undo/redo, sdílené zdi (tloušťka podle mezery), tloušťka a délka každé stěny v panelu
4. [ ] Nábytek + katalog (WC, geberit, sprcha, vana, umyvadlo, TV, stůl, linka, gauč, postel), snap ke zdi
5. [ ] Otvory ve zdech (CSG), materiály, stropy, SDK strop s rastrem profilů
6. [ ] Elektro: zásuvky, světla, kabely, auto-trasování
