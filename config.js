
require('dotenv').config();
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('Не знайдено BOT_TOKEN у .env');
}

const DATA_FILE = path.join(__dirname, 'data', 'data.json');
const IMPORT_FILE = path.join(__dirname, 'import', 'expenses.csv');

const REPORT_TIME = '08:00';

const TOPICS = {
  report: 'щоденний звіт',
  alert: 'сповіщення про аномальні витрати',
  news: 'новини від адміністратора'
};

const ALERT_MIN = 10;
const ALERT_MAX = 500;

const ADMIN_ID = /^\d+$/.test(process.env.ADMIN_ID || '')
  ? Number(process.env.ADMIN_ID)
  : null;

const BROADCAST_PAUSE_MS = 50;

// Лабораторна №17 — HTTP-приймання
const INGEST_KEY = process.env.INGEST_KEY;
const INGEST_HOST = '127.0.0.1';
const INGEST_PORT = Number(process.env.INGEST_PORT) || 3000;
const INGEST_URL =
  `http://${INGEST_HOST}:${INGEST_PORT}/readings`;

const HTTP_TIMEOUT_MS = 5000;

module.exports = {
  BOT_TOKEN,
  DATA_FILE,
  IMPORT_FILE,
  REPORT_TIME,
  TOPICS,
  ALERT_MIN,
  ALERT_MAX,
  ADMIN_ID,
  BROADCAST_PAUSE_MS,
  INGEST_KEY,
  INGEST_HOST,
  INGEST_PORT,
  INGEST_URL,
  HTTP_TIMEOUT_MS
};

