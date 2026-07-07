# 🌍 Echte bedrijven via Google Places API

Van demo naar echte Nederlandse bedrijven met **echte telefoonnummers en websites**.
De app gebruikt de **Places API (New)**.

> ℹ️ Let op: Google Places levert **telefoon + website**, maar **geen e-mailadres**
> (dat zit niet in de bron). Het e-mailfilter toont dus weinig/geen resultaat bij
> echte data — dat is normaal. Websites en telefoonnummers zijn wél echt.

---

## Deel 1 — Google API-key aanmaken (~5–10 min)

1. Ga naar **[console.cloud.google.com](https://console.cloud.google.com)** en log in met je Google-account.
2. **Maak een project:** bovenin op de projectkiezer klikken → **New Project** →
   naam bijv. `lead-finder` → **Create**. Selecteer het project daarna.
3. **Billing koppelen (verplicht, maar gratis tegoed):**
   - Menu → **Billing** → **Link a billing account** → voeg een betaalmethode toe.
   - Google Maps Platform geeft maandelijks **gratis tegoed** (doorgaans ~$200); voor
     normaal gebruik betaal je niets. Je wordt niet automatisch belast.
4. **API aanzetten:** menu → **APIs & Services** → **Library** →
   zoek op **“Places API (New)”** → openen → **Enable**.
5. **Key maken:** **APIs & Services** → **Credentials** → **Create credentials** →
   **API key** → **kopieer** de sleutel (begint met `AIza...`).
6. **Beveilig de key (aanbevolen):** klik de key aan →
   - **API restrictions** → *Restrict key* → vink **Places API (New)** aan → **Save**.
   - (Application restrictions op “None” laten staan; Render heeft geen vast IP.)
7. **Budgetalarm (aanbevolen):** **Billing** → **Budgets & alerts** → maak een budget
   van bijv. €5 met e-mailwaarschuwing. Zo krijg je nooit een verrassing.

---

## Deel 2 — In Render instellen (~2 min)

1. Ga naar **[dashboard.render.com](https://dashboard.render.com)** → je service **`ai-lead-finder-api`**.
2. Tab **Environment** → **Add Environment Variable**, voeg toe:

   | Key | Value |
   |---|---|
   | `GOOGLE_PLACES_API_KEY` | *(je gekopieerde key)* |
   | `LEAD_SOURCE` | `google` |

   (Optioneel: `MAX_PLACES_REQUESTS` = `40` — hoger = meer resultaten maar meer API-verbruik.)
3. **Save changes** → Render herstart de backend automatisch (~1–2 min).
4. Check: open `https://ai-lead-finder-api.onrender.com/api/health` →
   je hoort `"source":"google"` te zien.

---

## Deel 3 — Gebruiken

- Klik in het dashboard op **Genereer 50 Leads**. Nu worden echte bedrijven opgehaald,
  hun website wordt live geauditeerd en gescoord.
- **Tip:** kies vooraf een **provincie** en/of **branche** in de filters. Dat maakt de
  zoektocht gerichter én goedkoper (minder API-verzoeken).
- Eerste run kan wat langer duren (echte website-audits).

### Kosten kort
- Per generatie max. `MAX_PLACES_REQUESTS` (default 40) Places-verzoeken.
- Ruim binnen het gratis maandtegoed voor normaal gebruik.
- Budgetalarm ingesteld? Dan zit je sowieso veilig.
