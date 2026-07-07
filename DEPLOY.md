# 🚀 Online zetten: Netlify (frontend) + Render (backend, mock-modus)

De code staat al in een lokale Git-repo met een eerste commit. Volg deze 3 stappen.

---

## Stap 1 — Zet de code op GitHub

1. Maak een **leeg** repository aan op https://github.com/new
   - Naam: bijv. `ai-lead-finder`
   - **Geen** README/‎.gitignore aanvinken (die hebben we al)
2. Koppel en push (in PowerShell, in de projectmap):

```powershell
cd C:\Users\Jaimy\Downloads\ai-lead-finder
git remote add origin https://github.com/<jouw-gebruikersnaam>/ai-lead-finder.git
git push -u origin main
```

> Bij de eerste push opent er een venster om in te loggen bij GitHub — dat is normaal.

---

## Stap 2 — Backend op Render (gratis, mock-modus)

1. Ga naar https://dashboard.render.com → **New** → **Blueprint**
2. Koppel je GitHub-account en kies de `ai-lead-finder`-repo
3. Render leest automatisch **`render.yaml`** → klik **Apply**
4. Wacht tot de status **Live** is en kopieer de URL, bijv.
   `https://ai-lead-finder-api.onrender.com`
5. Test in je browser: `https://<jouw-render-url>/api/health`
   → je hoort JSON te zien met `"ok":true`.

> ⚠️ Gratis Render valt na ~15 min inactiviteit in slaap. De eerste aanvraag
> daarna duurt ~50 sec (koude start). In mock-modus wordt data in het geheugen
> bewaard, dus na een herstart zijn de leads weg — gewoon opnieuw genereren.

---

## Stap 3 — Frontend op Netlify

1. Ga naar https://app.netlify.com → **Add new site** → **Import an existing project**
2. Kies GitHub → de `ai-lead-finder`-repo
3. Netlify leest **`netlify.toml`** (base = `web`, build = `npm run build`). Laat staan.
4. **Belangrijk:** vóór/na de eerste build zet je de backend-URL als variabele:
   - **Site settings → Environment variables → Add variable**
   - Key: `VITE_API_URL`
   - Value: je Render-URL, bijv. `https://ai-lead-finder-api.onrender.com`
5. Trigger daarna een nieuwe deploy (**Deploys → Trigger deploy → Deploy site**)
   zodat de build de variabele meepakt.
6. Open je site: `https://<jouw-site>.netlify.app` 🎉

---

## Klaar — en daarna?

- **Strengere beveiliging:** zet in Render `CORS_ORIGIN` op je exacte Netlify-URL
  (i.p.v. `*`).
- **Echte data + opslag die blijft:** voeg in Render een **PostgreSQL** en **Redis**
  toe, zet `DATABASE_URL` + `REDIS_URL`, draai `npm run migrate`, start een aparte
  **worker** (`npm run worker`) en zet `LEAD_SOURCE=kvk` of `google` met de bijbehorende
  API-keys. Zie `README.md`.
- **AI-motivatie via Claude:** zet `ENABLE_AI=true` + `ANTHROPIC_API_KEY` in Render.

## Alternatief zonder GitHub (alleen frontend snel testen)
Je kunt de map `web/dist` (na `npm run build`) ook direct op https://app.netlify.com/drop
slepen. De frontend werkt dan, maar heeft nog steeds een online backend nodig
(`VITE_API_URL`) om leads te tonen.
