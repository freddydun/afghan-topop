require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const path = require('path');
const { OPERATORS, AMOUNTS_AFN, getOperatorByCode } = require('./operators');
const reloadly = require('./reloadly');
const orders = require('./orders');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Stripe-client wordt pas aangemaakt zodra er een key is ingevuld,
// zodat de server ook zonder keys opstart (handig om de site alvast te bekijken).
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// MVP: vaste omrekenkoersen AFN -> valuta. sim.af gebruikt een live FX-rate;
// dat kun je later toevoegen (bv. via exchangerate.host), voor nu zijn vaste
// koersen genoeg om te testen en simpel te houden. Pas aan naar actuele koersen
// voordat je live gaat.
const CURRENCIES = {
  gbp: { rate: 0.0159, symbol: '£', label: 'GBP' }, // 1 AFN = £0.0159
  eur: { rate: 0.0186, symbol: '€', label: 'EUR' }, // 1 AFN = €0.0186
  usd: { rate: 0.0201, symbol: '$', label: 'USD' }  // 1 AFN = $0.0201
};
const DEFAULT_CURRENCY = 'gbp';

// --- Stripe webhook heeft de RAW body nodig, dus dit moet VOOR express.json() ---
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send('Stripe/webhook is nog niet geconfigureerd.');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature check faalde:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { operatorCode, phone, amountAfn } = session.metadata || {};

    try {
      const operator = getOperatorByCode(operatorCode);
      if (!operator || operator.operatorId === null) {
        throw new Error(
          `Operator "${operatorCode}" heeft nog geen echte operatorId. Draai "npm run fetch-operators" en vul operators.js aan.`
        );
      }

      const result = await reloadly.sendTopup({
        operatorId: operator.operatorId,
        amount: Number(amountAfn),
        recipientNumber: phone,
        countryCode: 'AF',
        customIdentifier: session.id
      });

      orders.updateStatus(session.id, 'topup_sent', { reloadlyTransactionId: result.transactionId });
      console.log(`Top-up verstuurd voor sessie ${session.id}:`, result.transactionId);
    } catch (err) {
      orders.updateStatus(session.id, 'topup_failed', {
        error: err.response ? JSON.stringify(err.response.data) : err.message
      });
      console.error('Top-up versturen mislukt:', err.response ? err.response.data : err.message);
      // TODO: hier kun je jezelf een e-mail/Slack/WhatsApp-melding laten sturen
      // zodat je een mislukte top-up snel handmatig kan afhandelen en de klant
      // niet met een betaalde-maar-niet-geleverde top-up blijft zitten.
    }
  }

  res.json({ received: true });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Publieke config voor de frontend (nooit secrets hierin!)
app.get('/api/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    operators: OPERATORS.map(({ code, name, logo }) => ({ code, name, logo })),
    amountsAfn: AMOUNTS_AFN,
    currencies: CURRENCIES,
    defaultCurrency: DEFAULT_CURRENCY,
    sandbox: reloadly.IS_SANDBOX
  });
});

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is nog niet geconfigureerd (vul STRIPE_SECRET_KEY in .env in).' });
  }

  const { operatorCode, amountAfn, phone, currency } = req.body;
  const operator = getOperatorByCode(operatorCode);
  const currencyCode = (currency || DEFAULT_CURRENCY).toLowerCase();
  const currencyInfo = CURRENCIES[currencyCode];

  if (!operator) return res.status(400).json({ error: 'Onbekende operator.' });
  if (!currencyInfo) return res.status(400).json({ error: 'Onbekende valuta.' });
  if (!amountAfn || Number(amountAfn) <= 0) return res.status(400).json({ error: 'Ongeldig bedrag.' });
  if (!phone || !/^7\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Vul een geldig Afghaans nummer in (7XXXXXXXX, zonder +93).' });
  }

  const chargeAmount = Math.max(1, Number(amountAfn) * currencyInfo.rate);
  const amountInCents = Math.round(chargeAmount * 100);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currencyCode,
            product_data: {
              name: `${operator.name} Afghanistan Top-Up — ${amountAfn} AFN`
            },
            unit_amount: amountInCents
          },
          quantity: 1
        }
      ],
      metadata: {
        operatorCode,
        amountAfn: String(amountAfn),
        phone: `93${phone}`
      },
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/`
    });

    orders.save({
      sessionId: session.id,
      operatorCode,
      amountAfn,
      phone: `93${phone}`,
      chargeAmount: chargeAmount.toFixed(2),
      currency: currencyCode,
      status: 'awaiting_payment'
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Kon Stripe checkout session niet aanmaken:', err.message);
    res.status(500).json({ error: 'Er ging iets mis, probeer het later opnieuw.' });
  }
});

// Simpel (ongeauthenticeerd!) overzicht van orders — alleen handig voor lokaal testen.
// Zet hier ALTIJD een wachtwoord/auth voor voordat dit online staat.
app.get('/api/orders', (req, res) => {
  res.json(orders.readAll());
});

app.listen(PORT, () => {
  console.log(`\n✅ Server draait op ${BASE_URL}`);
  console.log(`   Reloadly-modus: ${reloadly.IS_SANDBOX ? 'SANDBOX (geen echt geld)' : '⚠️ LIVE'}`);
  if (!stripe) console.log('   ⚠️  STRIPE_SECRET_KEY ontbreekt nog in .env — checkout werkt nog niet.');
});
