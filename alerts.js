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

async function sendAlert(message) {
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
    // Als zelfs de alert faalt, in elk geval loggen zodat het in Render's logs blijft staan.
    console.error('Kon pushmelding niet versturen:', err.message);
  }
}

module.exports = { sendAlert };
