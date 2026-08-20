/**
 * Superlichte order-opslag in een JSON-bestand.
 * Prima voor de testfase; vervang dit later door een echte database (bv. SQLite/Postgres)
 * zodra je meer dan een paar tientallen orders per dag hebt.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'orders.json');

// Zorg dat de map altijd bestaat voordat we erin schrijven — lege mappen worden
// niet meegenomen als je bestanden naar GitHub upload, dus op een verse server
// (zoals Render) bestaat deze map in het begin nog niet.
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function save(order) {
  ensureDataDir();
  const orders = readAll();
  orders.unshift({ ...order, createdAt: new Date().toISOString() });
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
}

function updateStatus(sessionId, status, extra = {}) {
  ensureDataDir();
  const orders = readAll();
  const idx = orders.findIndex((o) => o.sessionId === sessionId);
  if (idx !== -1) {
    orders[idx] = { ...orders[idx], status, ...extra, updatedAt: new Date().toISOString() };
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
  }
  return orders[idx];
}

function getBySessionId(sessionId) {
  return readAll().find((o) => o.sessionId === sessionId);
}

module.exports = { readAll, save, updateStatus, getBySessionId };
