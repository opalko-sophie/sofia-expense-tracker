
const API_URL =
  'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchangenew';

const TIMEOUT_MS = 5000;
const CACHE_MS = 10 * 60 * 1000;

const cache = new Map();

// Отримання JSON із зовнішнього API
async function getJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(
      `Сервіс відповів помилкою ${response.status}`
    );
  }

  return await response.json();
}

async function getRate(code) {
  const currency = String(code).toUpperCase().trim();

  if (!/^[A-Z]{3}$/.test(currency)) {
    return null;
  }

  const saved = cache.get(currency);

  if (
    saved &&
    Date.now() - saved.savedAt < CACHE_MS
  ) {
    return saved.data;
  }

  const url =
    API_URL +
    '?valcode=' + encodeURIComponent(currency) +
    '&json';

  const result = await getJson(url);

  if (!Array.isArray(result)) {
    throw new Error('Некоректна структура відповіді API');
  }

  if (result.length === 0) {
    return null;
  }

  const item = result.find(
    row => row.cc === currency
  );

  if (!item) {
    return null;
  }

  if (
    typeof item.rate !== 'number' ||
    !Number.isFinite(item.rate) ||
    item.rate <= 0
  ) {
    throw new Error('У відповіді немає коректного курсу');
  }

  const data = {
    currency: item.cc,
    rate: item.rate,
    date: item.exchangedate
  };

  cache.set(currency, {
    savedAt: Date.now(),
    data
  });

  return data;
}

// Конвертація іноземної валюти в гривні
async function convertToUAH(amount, currency) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Некоректна сума');
  }

  const rate = await getRate(currency);

  if (rate === null) {
    return null;
  }

  return {
    amount,
    currency: rate.currency,
    rate: rate.rate,
    result: amount * rate.rate,
    date: rate.date
  };
}

// Очищення кешу для тестування
function clearCache() {
  cache.clear();
}

module.exports = {
  getJson,
  getRate,
  convertToUAH,
  clearCache
};

