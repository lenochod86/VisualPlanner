# Visual Planner

Webový plánovač bytu/domu (React + three.js, Fastify). Struktura a roadmapa: `README.md`.

## Jazyk
- S uživatelem mluv česky. Kód, commity a README jsou česky nebo anglicky podle okolí (dosavadní commity jsou česky).

## Git a větve
- `main` je chráněná (ruleset na GitHubu): změny jdou jen přes pull request, povinný zelený check `test`, žádný force push ani mazání `main`.
- Nikdy necommituj ani nepushuj přímo do `main`, pokud to uživatel výslovně neřekne.
- Pracuj na vlastní větvi z aktuálního `main`, jedna věc na větev. Před předáním větev rebasuj na `origin/main`.
- Force push jen `--force-with-lease` na vlastní větvi, nikdy na `main`.
- Merge až po výslovném souhlasu uživatele.
- Výjimka bez PR (commit rovnou do `main`): jen `.github/`, konfigurace nástrojů (`.claude/`, `.gitignore`) a tento soubor.

## Testy
- Před každým pushem spusť: `cd server && npm run typecheck && npm test` a `cd web && npm run build && npm test` (to samé běží v CI jako job `test`).
- Nová geometrie / logika v `web/src/geometry`, `web/src/domain` a `server/src/services` má mít test. Červený push je zbytečná práce.
