/**
 * Superlichte order-opslag in een JSON-bestand.
 * Prima voor de testfase; vervang dit later door een echte database (bv. SQLite/Postgres)
 * zodra je meer dan een paar tientallen orders per dag hebt.
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'orders.json');

function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function save(order) {
  const orders = readAll();
  orders.unshift({ ...order, createdAt: new Date().toISOString() });
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
}

function updateStatus(sessionId, status, extra = {}) {
  const orders = readAll();
  const idx = orders.findIndex((o) => o.sessionId === sessionId);
  if (idx !== -1) {
    orders[idx] = { ...orders[idx], status, ...extra, updatedAt: new Date().toISOString() };
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
  }
  return orders[idx];
}

module.exports = { readAll, save, updateStatus };
