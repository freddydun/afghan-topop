/**
 * Kleine wrapper rond de Reloadly Airtime API.
 *
 * LET OP: dit is gebouwd op basis van de publiek gedocumenteerde structuur van
 * Reloadly's API (OAuth2 client_credentials + REST endpoints onder topups(.sandbox).reloadly.com).
 * Reloadly kan veldnamen/endpoints wijzigen — check bij het live zetten altijd even
 * https://developers.reloadly.com/ om te bevestigen dat onderstaande nog klopt,
 * en pas aan waar nodig. De structuur (token ophalen -> operator opzoeken -> topup versturen)
 * blijft sowieso hetzelfde.
 */
const axios = require('axios');

const IS_SANDBOX = (process.env.RELOADLY_ENV || 'sandbox') === 'sandbox';

const AUTH_URL = 'https://auth.reloadly.com/oauth/token';
const TOPUPS_BASE = IS_SANDBOX
  ? 'https://topups-sandbox.reloadly.com'
  : 'https://topups.reloadly.com';

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  const { data } = await axios.post(AUTH_URL, {
    client_id: process.env.RELOADLY_CLIENT_ID,
    client_secret: process.env.RELOADLY_CLIENT_SECRET,
    grant_type: 'client_credentials',
    audience: TOPUPS_BASE
  });

  cachedToken = data.access_token;
  // 60s marge inbouwen voor het verlopen van de token
  cachedTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function authedClient() {
  const token = await getAccessToken();
  return axios.create({
    baseURL: TOPUPS_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/com.reloadly.topups-v1+json',
      'Content-Type': 'application/json'
    }
  });
}

/** Alle operators voor een land ophalen (gebruikt door scripts/fetch-operators.js) */
async function listOperatorsForCountry(countryIsoCode) {
  const client = await authedClient();
  const { data } = await client.get(`/operators/countries/${countryIsoCode}`);
  return data;
}

/** Operator automatisch herkennen op basis van telefoonnummer (handig als check) */
async function autoDetectOperator(phoneNumber, countryIsoCode) {
  const client = await authedClient();
  const { data } = await client.get(
    `/operators/auto-detect/phone/${encodeURIComponent(phoneNumber)}/countries/${countryIsoCode}`
  );
  return data;
}

/** Daadwerkelijk een top-up versturen */
async function sendTopup({ operatorId, amount, recipientNumber, countryCode, customIdentifier }) {
  const client = await authedClient();
  const { data } = await client.post('/topups', {
    operatorId,
    amount,
    useLocalAmount: true,
    customIdentifier,
    recipientPhone: {
      countryCode, // bv. "AF"
      number: recipientNumber // volledig internationaal formaat, bv. "93701234567"
    }
  });
  return data;
}

module.exports = { getAccessToken, listOperatorsForCountry, autoDetectOperator, sendTopup, IS_SANDBOX };
