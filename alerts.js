/**
 * Superlicht alert-systeem: stuurt jezelf een pushmelding als er iets misgaat
 * (bv. een top-up die na betaling toch mislukt), zodat je het meteen weet
 * in plaats van pas als een klant klaagt.
 *
 * Gebruikt ntfy.sh — een gratis dienst zonder account/registratie nodig.
 * Instellen (eenmalig, 2 minuten):
 *   1. Verzin een unieke, geheime "topic"-naam, bv. "peivand-alerts-x7k2"
 *      (hoe unieker, hoe kleiner de kans dat iemand anders 'm ook gebruikt).
 *   2. Zet die naam als ALERT_NTFY_TOPIC in je .env (lokaal) en in Render's
 *      Environment variables (live).
 *   3. Installeer de gratis ntfy-app (iOS/Android) of open in je browser:
 *      https://ntfy.sh/jouw-topic-naam — en abonneer je op dat topic.
 *   4. Klaar. Zonder ALERT_NTFY_TOPIC ingesteld doet dit bestand gewoon niets
 *      (geen foutmeldingen, alleen geen pushmeldingen).
 */
const axios = require('axios');

// ntfy.sh is een gratis, gedeelde dienst — af en toe geeft die kort een
// "429 Too Many Requests" terug (bv. omdat Render's gratis laag een IP-adres
// deelt met andere apps). Dat is meestal maar een paar seconden. Daarom
// proberen we het bij een fout automatisch nog 2x, met een korte pauze
// ertussen, voordat we het echt opgeven.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000; // 3 seconden tussen pogingen

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendAlert(message, attempt = 1) {
  const topic = process.env.ALERT_NTFY_TOPIC;
  if (!topic) {
    console.warn('ALERT_NTFY_TOPIC niet ingesteld — pushmelding overgeslagen:', message);
    return;
  }

  try {
    await axios.post(`https://ntfy.sh/${topic}`, message, {
      headers: { Title: 'Afghan Top-Up — actie nodig', Priority: 'urgent' }
    });
  } catch (err) {
    if (attempt < MAX_ATTEMPTS) {
      console.warn(
        `Pushmelding poging ${attempt} mislukt (${err.message}), probeer over ${RETRY_DELAY_MS / 1000}s opnieuw...`
      );
      await wait(RETRY_DELAY_MS);
      return sendAlert(message, attempt + 1);
    }
    // Alle pogingen mislukt — in elk geval loggen zodat het in Render's logs blijft staan.
    console.error(`Kon pushmelding niet versturen na ${MAX_ATTEMPTS} pogingen:`, err.message);
  }
}

module.exports = { sendAlert };
