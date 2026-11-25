
const http = require('http');
const config = require('./config');
const storage = require('./storage');
const alerts = require('./alerts');

const MAX_BODY = 10 * 1024;

// Часові обмеження
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_MS = 5 * 60 * 1000;
const ALERT_RECENT_MS = 10 * 60 * 1000;

// Перевірка часу вимірювання
function isValidTime(text) {
  if (typeof text !== 'string') {
    return false;
  }

  const moment = new Date(text);

  if (
    !Number.isFinite(moment.getTime()) ||
    moment.toISOString() !== text
  ) {
    return false;
  }

  const age = Date.now() - moment.getTime();

  return (
    age <= MAX_AGE_MS &&
    age >= -MAX_FUTURE_MS
  );
}

// Читання тіла HTTP-запиту
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let tooLarge = false;

    req.on('data', chunk => {
      if (tooLarge) return;

      size += chunk.length;

      if (size > MAX_BODY) {
        tooLarge = true;
        reject(new Error('too large'));
        return;
      }

      body += chunk.toString('utf8');
    });

    req.on('end', () => {
      if (!tooLarge) resolve(body);
    });

    req.on('error', reject);
  });
}

// JSON-відповідь сервера
function sendJson(res, status, data) {
  if (res.headersSent) return;

  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8'
  });

  res.end(JSON.stringify(data));
}

// Обробка запитів симулятора
async function handleRequest(bot, req, res) {

  if (req.url !== '/readings') {
    return sendJson(res, 404, {
      ok: false,
      error: 'not found'
    });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, {
      ok: false,
      error: 'use POST'
    });
  }

  // Перевірка секретного ключа
  if (req.headers['x-api-key'] !== config.INGEST_KEY) {
    return sendJson(res, 401, {
      ok: false,
      error: 'wrong key'
    });
  }

  let body;

  try {
    body = await readBody(req);
  } catch (error) {
    if (error.message === 'too large') {
      res.setHeader('Connection', 'close');

      return sendJson(res, 413, {
        ok: false,
        error: 'body too large'
      });
    }

    throw error;
  }

  let data;

  try {
    data = JSON.parse(body);
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: 'invalid json'
    });
  }

  // Перевірка категорії
  if (
    data === null ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    typeof data.category !== 'string' ||
    data.category.trim().length === 0 ||
    data.category.length > 30
  ) {
    return sendJson(res, 400, {
      ok: false,
      error: 'invalid category'
    });
  }

  // Перевірка суми
  if (
    typeof data.amount !== 'number' ||
    !Number.isFinite(data.amount) ||
    data.amount <= 0
  ) {
    return sendJson(res, 400, {
      ok: false,
      error: 'invalid amount'
    });
  }

  // ЛАБА №18 — перевірка часу
  if (!isValidTime(data.time)) {
    return sendJson(res, 400, {
      ok: false,
      error: 'invalid time'
    });
  }

  let record;

  try {
    record = storage.addDeviceExpense(
      data.category.trim(),
      data.amount,
      data.time
    );
  } catch (error) {
    console.error('ingest save:', error.message);

    return sendJson(res, 500, {
      ok: false,
      error: 'save failed'
    });
  }

  // Повторне показання не зберігаємо
  if (record === null) {
    return sendJson(res, 200, {
      ok: true,
      duplicate: true
    });
  }

  // Сповіщення лише для свіжих аномалій
  const age = Date.now() -
    new Date(record.createdAt).getTime();

  if (age >= 0 && age < ALERT_RECENT_MS) {
    alerts.checkExpense(bot, record);
  }

  return sendJson(res, 201, {
    ok: true,
    id: record.id
  });
}

// Запуск HTTP-сервера
function start(bot) {
  if (!config.INGEST_KEY) {
    console.error(
      'INGEST_KEY не знайдено в .env'
    );
    return null;
  }

  const server = http.createServer((req, res) => {
    handleRequest(bot, req, res).catch(error => {
      console.error('ingest:', error.message);

      if (!res.headersSent) {
        sendJson(res, 500, {
          ok: false,
          error: 'server error'
        });
      }
    });
  });

  server.on('error', error => {
    console.error('HTTP-сервер:', error.message);
  });

  server.listen(
    config.INGEST_PORT,
    config.INGEST_HOST,
    () => {
      console.log(
        '✅ Приймання витрат: http://' +
        config.INGEST_HOST + ':' +
        server.address().port +
        '/readings'
      );
    }
  );

  return server;
}

module.exports = {
  start,
  handleRequest,
  isValidTime
};

