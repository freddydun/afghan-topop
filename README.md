# Afghan Top-Up — MVP

Simpele website om mobiele top-up naar Afghanistan te verkopen (MTN, Roshan, Etisalat, AWCC, Salaam). Klant kiest operator + bedrag, betaalt via Stripe, en zodra de betaling binnen is stuurt de server automatisch de top-up via Reloadly.

Alles staat standaard in **sandbox/test-modus** — je kan dit dus vandaag al lokaal draaien en uitproberen zonder dat er ergens echt geld omgaat.

## Wat zit erin

```
afghan-topup-mvp/
├── server.js          # Express-server: checkout aanmaken, webhook afhandelen
├── reloadly.js         # Wrapper rond de Reloadly Airtime API
├── operators.js        # De 5 Afghaanse operators (operatorId's moet je nog invullen)
├── orders.js            # Simpele order-opslag in data/orders.json
├── scripts/fetch-operators.js   # Haalt echte Reloadly operator-ID's op
└── public/              # De website zelf (HTML/CSS/JS), incl. i18n-structuur
```

## Stap 1 — Lokaal draaien (kan nu al, met sandbox-keys)

1. Zorg dat [Node.js](https://nodejs.org) is geïnstalleerd (v18+).
2. In deze map:
   ```
   npm install
   cp .env.example .env
   ```
3. Vul in `.env` je **Reloadly sandbox** keys in (gratis, direct beschikbaar na registratie op
   [reloadly.com/registration](https://www.reloadly.com/registration) → dashboard → sandbox credentials).
4. Vul in `.env` je **Stripe test** keys in (gratis, direct beschikbaar na registratie op
   [dashboard.stripe.com/register](https://dashboard.stripe.com/register) → "Developers" → "API keys",
   gebruik de keys die met `sk_test_` / `pk_test_` beginnen).
5. Start de server:
   ```
   npm start
   ```
6. Open [http://localhost:3000](http://localhost:3000) — de bestel-flow werkt nu tot aan Stripe Checkout.

## Stap 2 — Echte operator-ID's ophalen

Reloadly geeft elke operator een eigen numeriek ID (verschillend per land en per sandbox/live). In `operators.js` staan de 5 operators nu met `operatorId: null`. Zodra je sandbox-keys in `.env` staan:

```
npm run fetch-operators
```

Dit print de echte ID's voor Afghanistan. Kopieer ze naar `operators.js` bij de juiste operator (MTN, Roshan, Etisalat, AWCC, Salaam).

## Stap 3 — Stripe webhook lokaal testen

Zonder webhook wordt een betaling wel geïncasseerd, maar wordt de top-up nooit automatisch verstuurd. Om dit lokaal te testen:

1. Installeer de [Stripe CLI](https://docs.stripe.com/stripe-cli).
2. Draai:
   ```
   stripe listen --forward-to localhost:3000/api/webhook
   ```
3. Kopieer de `whsec_...` die dit teruggeeft naar `STRIPE_WEBHOOK_SECRET` in je `.env`, herstart de server.
4. Doe een testbetaling op de site met een [Stripe testkaart](https://docs.stripe.com/testing) (bv. `4242 4242 4242 4242`, elke toekomstige vervaldatum, elke CVC).
5. Check `data/orders.json` — de status moet van `awaiting_payment` naar `topup_sent` gaan. Check ook de sandbox-transacties in je Reloadly-dashboard.

## Stap 4 — Live zetten (pas als KYB/Stripe goedgekeurd zijn)

1. Zet `RELOADLY_ENV=live` en vul je **live** Reloadly-keys in (pas beschikbaar na goedgekeurde KYB-aanvraag).
2. Vul je **live** Stripe-keys in (`sk_live_...` / `pk_live_...`).
3. Draai `npm run fetch-operators` opnieuw — live-operatorID's zijn anders dan sandbox-ID's, dus `operators.js` moet je dan opnieuw bijwerken.
4. Deploy de app (zie hieronder) en zet in je Stripe-dashboard een live webhook-endpoint naar `https://jouw-domein.com/api/webhook`, event `checkout.session.completed`.

### Simpelste manier om te hosten

Dit is een gewone Node/Express-app (geen speciale build nodig), dus dit draait direct op:
- **Render.com** of **Railway.app** — koppel je GitHub-repo, zet de environment variables uit `.env` in hun dashboard, klaar. Beide hebben een gratis/goedkope laag die prima is om mee te starten.
- Vermijd Vercel voor dit project — dat is gebouwd voor "serverless" functies en werkt minder soepel met een lange-termijn Express-server zoals deze.

## Talen

De taalkeuze (rechtsboven op de site) ondersteunt nu Engels, Dari (`fa`) en Pashto (`ps`). Kies een taal en de hele pagina spiegelt automatisch naar RTL (rechts-naar-links) — inclusief lettertype (Noto Sans Arabic), tekstrichting, en de opmaak van het telefoonnummerveld (dat blijft bewust links-naar-rechts leesbaar, ook in een RTL-pagina, want telefoonnummers lees je altijd zo).

**Belangrijke kanttekening:** de Dari- en Pashto-teksten in `public/locales/fa.json` en `public/locales/ps.json` zijn door mij vertaald op basis van mijn taalkennis, maar zijn niet nagekeken door een native speaker. Voordat dit live gaat naar echte klanten: laat een moedertaalspreker (je vriend, of iemand via Fiverr) deze twee bestanden doorlezen. Het zijn maar 15 korte zinnen per taal, dus dat kost iemand een paar minuten.

Nieuwe taal toevoegen (bv. Duits of Nederlands, zoals we eerder bespraken): maak een nieuw bestand `public/locales/xx.json` naar het voorbeeld van `en.json`, zet `"_meta": {"dir": "ltr", "label": "Deutsch"}` bovenaan, en voeg een `<option value="xx">Deutsch</option>` toe in de taalkiezer in `index.html`. Geen verdere code-aanpassingen nodig.

## Belangrijk: wat nog handmatig werk is
- **Live FX-koers:** `AFN_TO_GBP` in `server.js` is nu een vaste waarde die je zelf up-to-date moet houden. Kan later vervangen worden door een live wisselkoers-API.
- **Mislukte top-ups:** als Reloadly een top-up niet kan versturen (bv. verkeerd nummer), wordt dat nu alleen in de server-log en in `data/orders.json` gezet (`status: topup_failed`). Je moet dit zelf in de gaten houden en de klant handmatig terugbetalen/opnieuw proberen tot je dit geautomatiseerd hebt.
- **Reloadly API-details:** `reloadly.js` is gebouwd op de publiek bekende structuur van hun Airtime API. Check bij het live zetten even [developers.reloadly.com](https://developers.reloadly.com/) om te bevestigen dat veldnamen nog kloppen — API's veranderen soms.

## Kon ik dit hier volledig testen?

Bijna: alle bestanden zijn met `node --check` op syntaxfouten gecontroleerd (allemaal oké), en de logica is stap voor stap nagelopen. Ik kon `npm install` in deze omgeving niet draaien (geen toegang tot de npm-registry vanuit deze sandbox), dus de daadwerkelijke boot-test (`npm start` + een testbetaling doen) moet jij op je eigen laptop doen. Loop je tegen een foutmelding aan, stuur 'm door en dan los ik 'm met je op.
