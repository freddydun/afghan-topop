/**
 * De 5 Afghaanse operators die we ondersteunen.
 *
 * operatorId's zijn nu ECHTE Reloadly SANDBOX-ID's, opgehaald via /api/debug/operators
 * op [datum invullen]. Let op: zodra je naar LIVE overschakelt (RELOADLY_ENV=live),
 * kunnen deze ID's anders zijn — haal ze dan opnieuw op via diezelfde debug-URL nadat
 * je live-keys in Render staan, en vervang de waarden hieronder.
 *
 * Reloadly heeft trouwens ook aparte "Data"-varianten per operator (bv. voor losse
 * databundels i.p.v. gewoon beltegoed) — die IDs kwamen ook mee in de debug-lijst,
 * voor als je later een apart "databundel"-product wil toevoegen naast top-up.
 */
const OPERATORS = [
  { code: 'mtn', name: 'MTN', country: 'AF', operatorId: 999999, logo: '/img/mtn.svg' },
  { code: 'roshan', name: 'Roshan', country: 'AF', operatorId: 4, logo: '/img/roshan.svg' },
  { code: 'etisalat', name: 'Etisalat', country: 'AF', operatorId: 3, logo: '/img/etisalat.svg' },
  { code: 'awcc', name: 'AWCC', country: 'AF', operatorId: 1, logo: '/img/awcc.svg' },
  { code: 'salaam', name: 'Salaam', country: 'AF', operatorId: 706, logo: '/img/salaam.svg' }
];

// Standaard AFN-bedragen die we als knoppen tonen (net als bij sim.af: 250 / 500 / 1000 etc.)
const AMOUNTS_AFN = [250, 500, 1000, 2000];

function getOperatorByCode(code) {
  return OPERATORS.find((o) => o.code === code);
}

module.exports = { OPERATORS, AMOUNTS_AFN, getOperatorByCode };
