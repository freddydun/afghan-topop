// --- i18n: laadt /locales/<lang>.json en past dir="rtl"/"ltr" automatisch aan.
// Nieuwe taal toevoegen? Zie de instructies in README.md.
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

// --- Merkkleuren per operator, voor de kleur-per-netwerk-selector ---
// Val terug op --accent (groen) voor een operator die hier niet in staat.
const OPERATOR_COLORS = {
  mtn: '#c7a411',
  roshan: '#c8323c',
  etisalat: '#2c9455',
  awcc: '#2f6fb0',
  salaam: '#7d4fbf'
};
const DEFAULT_ACCENT = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#167a4f';

function operatorColor(code) {
  return OPERATOR_COLORS[code] || DEFAULT_ACCENT;
}

// --- Bestelformulier ---
let state = { operatorCode: null, amountAfn: null, currency: null };
let appConfig = null;

function applyAccentColor(color) {
  const submitBtn = document.getElementById('submit-btn');
  const prefix = document.getElementById('phone-prefix');
  if (submitBtn) submitBtn.style.background = color;
  if (prefix) prefix.style.color = color;
}

function renderOperatorRow() {
  const row = document.getElementById('operator-row');
  row.innerHTML = '';
  appConfig.operators.forEach((op) => {
    const isSelected = op.code === state.operatorCode;
    const color = operatorColor(op.code);

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'operator-item' + (isSelected ? ' selected' : '');

    const circle = document.createElement('div');
    circle.className = 'operator-circle';
    circle.textContent = op.name.charAt(0);
    if (isSelected) {
      circle.style.background = color;
      circle.style.borderColor = color;
      circle.style.boxShadow = `0 0 0 4px ${color}22`;
    }

    const name = document.createElement('span');
    name.className = 'operator-name';
    name.textContent = op.name;
    if (isSelected) name.style.color = color;

    item.appendChild(circle);
    item.appendChild(name);
    item.addEventListener('click', () => {
      state.operatorCode = op.code;
      renderOperatorRow();
      renderAmountGrid();
      applyAccentColor(color);
    });
    row.appendChild(item);
  });
}

function renderAmountGrid() {
  const amountGrid = document.getElementById('amount-grid');
  const currencyInfo = appConfig.currencies[state.currency];
  const accent = operatorColor(state.operatorCode);
  amountGrid.innerHTML = '';

  appConfig.amountsAfn.forEach((amount, i) => {
    const isPopular = i === 1; // 2e bedrag = "meest verstuurd", zoals sim.af
    const isSelected = amount === state.amountAfn;
    const converted = (amount * currencyInfo.rate).toFixed(2);

    const card = document.createElement('div');
    card.className = 'amount-card';
    if (isSelected) card.style.borderColor = accent;

    const top = document.createElement('div');
    top.className = 'top';
    top.style.background = isSelected ? `${accent}14` : '';
    top.innerHTML = `
      ${isPopular ? `<div class="badge-tag" style="color:${accent}">Most sent</div>` : '<div style="height:13px"></div>'}
      <div class="amount-num">${amount}</div>
      <div class="amount-unit">AFN</div>
    `;

    const bottom = document.createElement('div');
    bottom.className = 'bottom';
    bottom.textContent = `~${currencyInfo.symbol}${converted}`;

    card.appendChild(top);
    card.appendChild(bottom);
    card.addEventListener('click', () => {
      state.amountAfn = amount;
      renderAmountGrid();
    });
    amountGrid.appendChild(card);
  });
}

async function init() {
  const res = await fetch('/api/config');
  appConfig = await res.json();

  document.getElementById('sandbox-banner').style.display = appConfig.sandbox ? 'block' : 'none';

  state.operatorCode = appConfig.operators[0]?.code || null;
  renderOperatorRow();

  // Valutakiezer vullen (GBP/EUR/USD, uit server-config)
  const currencySwitch = document.getElementById('currency-switch');
  Object.entries(appConfig.currencies).forEach(([code, info]) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${info.symbol} ${info.label}`;
    currencySwitch.appendChild(opt);
  });
  state.currency = localStorage.getItem('currency') || appConfig.defaultCurrency;
  currencySwitch.value = state.currency;
  currencySwitch.addEventListener('change', (e) => {
    state.currency = e.target.value;
    localStorage.setItem('currency', state.currency);
    renderAmountGrid();
  });

  state.amountAfn = appConfig.amountsAfn[1] || appConfig.amountsAfn[0];
  renderAmountGrid();
  applyAccentColor(operatorColor(state.operatorCode));
}

function showError(msg) {
  const el = document.getElementById('form-error');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

const submitBtn = document.getElementById('submit-btn');
if (submitBtn) submitBtn.addEventListener('click', async () => {
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
        currency: state.currency,
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

// Alleen de bestel-flow initialiseren op pagina's die dat formulier ook echt hebben
// (bv. niet op success.html, die alleen de i18n/RTL-logica hierboven nodig heeft).
if (document.getElementById('operator-row')) {
  init();
}
