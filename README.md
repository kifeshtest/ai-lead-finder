# AI Lead Finder Nederland

Vind met één druk op de knop Nederlandse bedrijven die een goede lead zijn voor webdesign:
bedrijven **zonder website** of met een **verouderde/zwakke website** (score < 55/100).

De app zoekt bedrijven via officiële bronnen, auditeert hun website (SSL, mobielvriendelijkheid,
snelheid, CMS, privacy/contact, actualiteit), geeft een score van 0–100, ontdubbelt, en toont
per generatie **50 unieke leads** met een AI-motivatie.

---

## ⚖️ Belangrijk: bronnen & juridische uitgangspunten

Deze applicatie is bewust gebouwd om **binnen de voorwaarden** van de bronnen te blijven:

- **KVK** → uitsluitend via de **officiële KVK API** (API-key nodig). Er wordt **niet** gescrapet
  op KVK-pagina's; grootschalig hergebruik van Handelsregistergegevens is aan voorwaarden gebonden.
- **Google** → via de **Google Places API** (key + billing). **Geen** ongeautoriseerde scraping
  van Google Bedrijfsprofielen.
- **E-mailadressen** worden **niet** van websites geoogst (AVG). E-mail wordt alleen getoond als
  een officiële bron het veld levert.
- **Website-audits** laden de openbare website van een bedrijf om technische kwaliteit te meten —
  dit is standaard en toegestaan.

Zonder API-keys draait de app op een **mock-provider** met realistische voorbeelddata, zodat je de
volledige workflow, filters, scoring, dashboard en export direct kunt uitproberen.

---

## 🚀 Snel starten (zonder infra — mock data)

Vereist: **Node.js 18+**.

```bash
# 1. Backend
cd server
cp .env.example .env          # standaard: LEAD_SOURCE=mock, geen DB/Redis nodig
npm install
npm run dev                   # start API op http://localhost:4000

# 2. Frontend (nieuwe terminal)
cd web
npm install
npm run dev                   # open http://localhost:5173
```

In deze modus:
- `LEAD_SOURCE=mock` → realistische Nederlandse voorbeeldbedrijven
- geen `DATABASE_URL` → **in-memory** opslag (ephemeraal, verdwijnt bij herstart)
- geen `REDIS_URL` → **inline worker** (job draait in-process, geen Redis nodig)
- geen `ANTHROPIC_API_KEY` → motivatie via nette template i.p.v. AI

Klik op **Genereer Leads** en je krijgt 50 unieke leads.

---

## 🏗️ Productie-opzet (Postgres + Redis + echte bronnen)

```bash
docker compose up -d          # start PostgreSQL + Redis
cd server
# vul in .env: DATABASE_URL, REDIS_URL, LEAD_SOURCE=kvk of google, keys, ENABLE_AI=true
npm install
npm run migrate               # maakt tabellen aan
npm run dev                   # API
npm run worker                # aparte BullMQ-worker (queue-modus)
```

| Variabele | Betekenis |
|---|---|
| `LEAD_SOURCE` | `mock` \| `kvk` \| `google` |
| `DATABASE_URL` | Postgres-connectie (leeg = in-memory) |
| `REDIS_URL` | Redis-connectie (leeg = inline worker) |
| `SCORE_THRESHOLD` | Onder deze score = lead (default 55) |
| `LEADS_PER_RUN` | Aantal leads per generatie (default 50) |
| `KVK_API_KEY` | Officiële KVK API-key |
| `GOOGLE_PLACES_API_KEY` | Google Places API-key |
| `ENABLE_LIGHTHOUSE` | `true` = echte Lighthouse-audit (Chrome nodig) |
| `ENABLE_AI` + `ANTHROPIC_API_KEY` | AI-motivatie via Claude |

---

## 🧱 Stack

React + TailwindCSS · Node.js + Express · PostgreSQL · BullMQ (Redis) · Playwright + Lighthouse · Anthropic Claude

## 📂 Structuur

```
server/  Express API, providers, audit-engine, scoring, AI, queue
web/     React + Tailwind dashboard
docker-compose.yml   Postgres + Redis
```

Zie `server/src/services` voor de kern: `sources/` (bronnen), `audit/` (website-analyse),
`ai/` (motivatie), `leadService.js` (orkestratie + ontdubbeling + zoeken-tot-50).
