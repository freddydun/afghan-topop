/**
 * De 5 Afghaanse operators die we ondersteunen.
 *
 * BELANGRIJK: operatorId is een placeholder (null). Reloadly kent elke operator
 * een eigen numeriek ID toe, en dat ID verschilt tussen hun sandbox- en live-omgeving.
 * Je haalt de echte ID's op zodra je Reloadly-sandbox-keys hebt door:
 *
 *   npm run fetch-operators
 *
 * Dat script (scripts/fetch-operators.js) zoekt automatisch alle Afghaanse operators op
 * en print de ID's die je hieronder moet invullen.
 */
const OPERATORS = [
  { code: 'mtn', name: 'MTN', country: 'AF', operatorId: null, logo: '/img/mtn.svg' },
  { code: 'roshan', name: 'Roshan', country: 'AF', operatorId: null, logo: '/img/roshan.svg' },
  { code: 'etisalat', name: 'Etisalat', country: 'AF', operatorId: null, logo: '/img/etisalat.svg' },
  { code: 'awcc', name: 'AWCC', country: 'AF', operatorId: null, logo: '/img/awcc.svg' },
  { code: 'salaam', name: 'Salaam', country: 'AF', operatorId: null, logo: '/img/salaam.svg' }
];

// Standaard AFN-bedragen die we als knoppen tonen (net als bij sim.af: 250 / 500 / 1000 etc.)
const AMOUNTS_AFN = [250, 500, 1000, 2000];

function getOperatorByCode(code) {
  return OPERATORS.find((o) => o.code === code);
}

module.exports = { OPERATORS, AMOUNTS_AFN, getOperatorByCode };
