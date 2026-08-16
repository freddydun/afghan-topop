/**
 * Eenmalig script: haalt de echte Reloadly operator-ID's op voor Afghanistan
 * en print ze, zodat je ze in operators.js kan invullen.
 *
 * Gebruik:
 *   1. Zorg dat .env is ingevuld met RELOADLY_CLIENT_ID / SECRET (sandbox mag)
 *   2. npm run fetch-operators
 */
require('dotenv').config();
const { listOperatorsForCountry } = require('../reloadly.js');

async function main() {
  try {
    const operators = await listOperatorsForCountry('AF');
    console.log(`\nGevonden ${operators.length} operator(s) voor Afghanistan:\n`);
    operators.forEach((op) => {
      console.log(`- ${op.name} (id: ${op.operatorId}) — bonus: ${op.bonus || 'n.v.t.'}`);
    });
    console.log('\nKopieer de operatorId waarden naar operators.js bij de bijbehorende operator.\n');
  } catch (err) {
    console.error('Kon operators niet ophalen. Check je .env (RELOADLY_CLIENT_ID/SECRET) en of je sandbox-account actief is.');
    console.error(err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

main();
