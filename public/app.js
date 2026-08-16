// --- i18n: laadt /locales/<lang>.json en past dir="rtl"/"ltr" automatisch aan.
// Zodra je fa.json (Dari) en ps.json (Pashto) toevoegt met "_meta.dir": "rtl",
// spiegelt de hele pagina automatisch mee (zie style.css: logische CSS-properties).
async function loadLocale(lang) {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    if (!res.ok) throw new Error('locale not found');
    const dict = await res.json();

    document.documentElement.lang = lang;
    document.documentElement.dir = dict._meta?.dir || 'ltr';
    document.body.dir = dict._meta?.dir || 'ltr';

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    localStorage.setItem('lang', lang);
  } catch (e) {
    console.warn(`Kon locale "${lang}" niet laden, val terug op de standaardtekst.`, e);
  }
}

const langSwitch = document.getElementById('lang-switch');
if (langSwitch) {
  langSwitch.value = localStorage.getItem('lang') || 'en';
  langSwitch.addEventListener('change', (e) => loadLocale(e.target.value));
}
loadLocale(langSwitch ? langSwitch.value : 'en');

// --- Bestelformulier ---
let state = { operatorCode: null, amountAfn: null };

async function init() {
  const res = await fetch('/api/config');
  const config = await res.json();

  document.getElementById('sandbox-banner').style.display = config.sandbox ? 'block' : 'none';

  const operatorGrid = document.getElementById('operator-grid');
  config.operators.forEach((op, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (i === 0 ? ' selected' : '');
    chip.textContent = op.name;
    chip.dataset.code = op.code;
    chip.addEventListener('click', () => {
      document.querySelectorAll('#operator-grid .chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.operatorCode = op.code;
    });
    operatorGrid.appendChild(chip);
  });
  state.operatorCode = config.operators[0]?.code || null;

  const amountGrid = document.getElementById('amount-grid');
  config.amountsAfn.forEach((amount, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (i === 1 ? ' selected' : ''); // 2e bedrag = "populair", zoals sim.af
    const gbp = (amount * config.afnToGbp).toFixed(2);
    chip.innerHTML = `${amount} AFN<br><small style="opacity:.6">~£${gbp}</small>`;
    chip.dataset.amount = amount;
    chip.addEventListener('click', () => {
      document.querySelectorAll('#amount-grid .chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.amountAfn = amount;
    });
    amountGrid.appendChild(chip);
  });
  state.amountAfn = config.amountsAfn[1] || config.amountsAfn[0];
}

function showError(msg) {
  const el = document.getElementById('form-error');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

document.getElementById('submit-btn').addEventListener('click', async () => {
  showError('');
  const phone = document.getElementById('phone').value.trim();

  if (!/^7\d{8}$/.test(phone)) {
    showError('Please enter a valid Afghan number (7XXXXXXXX, without +93).');
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operatorCode: state.operatorCode,
        amountAfn: state.amountAfn,
        phone
      })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Something went wrong.');

    window.location.href = data.url; // door naar Stripe Checkout
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = 'Send Top-Up';
  }
});

init();
