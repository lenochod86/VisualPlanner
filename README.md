# Visual Planner

Webový plánovač bytu/domu: půdorys (2D) + 3D vizualizace. Jednotky: cm.

## Spuštění (Docker)

    docker compose up --build                                   # dev, http://localhost:5173 (API :3001)
    docker compose --profile prod up --build web-prod api-prod  # produkce, http://localhost:8080

Projekt se ukládá na server do `./data/<id>.json` (není v gitu). Testy: `docker compose run --rm web npm test`, `docker compose run --rm api npm test`.

## Struktura

    web/                      frontend (Vite + React + TypeScript)
      src/config.ts           ladicí konstanty (mřížka, magnet, minima)
      src/domain/             datový model (types), katalogy (místnosti, překážky, nábytek), výchozí projekt + validace
      src/geometry/           čistá geometrie bez Reactu a bez stavu (+ testy)
        polygon.ts            plocha, těžiště, stěny, změna délky/pozice stěny
        magnet.ts             přichytávání místností k sousedům (sdílená zeď)
        walls.ts              model zdí: sdílené zdi, tloušťky, vnější obrys
        placement.ts          poloha překážek a nábytku: připnutí ke zdi, tažení, otáčení
        openings.ts           otvory ve zdech pro okna a dveře
        ceiling.ts            výška podhledu, rastr profilů SDK
        electric.ts           poloha elektro bodů, auto-trasování kabelů, délky
        collisions.ts         kontrola nábytku: přesah do zdi, překrytí, výška, dveře
      src/store/              Zustand: projectStore (data), uiStore (výběr, nástroj), history (undo/redo)
      src/api/                klient REST API
      src/report/             bilance elektra (soupis, export CSV) a tisknutelný půdorys (SVG ve měřítku, tisk/PDF)
      src/features/
        plan2d/               2D editor: viewport, tažení, vykreslení místností/překážek
        view3d/               3D scéna (react-three-fiber)
        topbar/               horní lišta: záložky Půdorys / Vybavení / Elektro, zpět/znovu, export/import
        sidebar/              levý panel: nástroje podle záložky a vlastnosti vybraného
        interaction/          sdílená logika přesouvání věcí (2D i 3D)
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
4. [x] Nábytek: katalog (WC volné i Geberit, sprcha, vana, umyvadlo, TV, stůl, židle, linka, gauč, postele, skříň), snap ke zdi, otáčení, přesun mezi místnostmi
5. [x] Otvory ve zdech pro okna a dveře, materiály zdí, stropy (omítnutý, SDK podhled s rastrem profilů, průhledný režim)
6. [x] Elektro: zásuvky, vypínače, světla, rozvaděč; kabely s typem a okruhem, auto-trasování (editovatelné), zobrazení skrz zdi/strop/nábytek
