
const config = require('./config');
const storage = require('./storage');
const signal = require('./utils/signal');

config.INGEST_KEY = 'test-simulator-key';
config.INGEST_PORT = 0;
config.BROADCAST_PAUSE_MS = 1;

// Тимчасове сховище тільки для тесту
const records = [];
const alertsSent = [];

storage.addExpense = (userId, category, amount) => {
  const record = {
    id: records.length + 1,
    userId,
    category,
    amount,
    createdAt: new Date().toISOString()
  };

  records.push(record);
  return record;
};

storage.listSubscribers = topic =>
  topic === 'alert' ? [111] : [];

storage.removeSubscriber = () => {};

const ingest = require('./ingest');

const fakeBot = {
  telegram: {
    sendMessage: async (id, text) => {
      alertsSent.push(text.split('\n')[0]);
    }
  }
};

async function post(url, key, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key
    },
    body
  });

  return response.status;
}

async function main() {
  const server = ingest.start(fakeBot);

  try {
    if (!server.listening) {
      await new Promise(resolve =>
        server.once('listening', resolve)
      );
    }

    const url =
      `http://127.0.0.1:${server.address().port}/readings`;

    console.log(
      '1. Правильний запит:',
      await post(
        url, config.INGEST_KEY,
        JSON.stringify({
          category: 'Продукти',
          amount: 250
        })
      )
    );

    console.log(
      '2. Неправильний ключ:',
      await post(
        url, 'wrong-key',
        '{"category":"Кафе","amount":100}'
      )
    );

    console.log(
      '3. Некоректний JSON:',
      await post(url, config.INGEST_KEY, '{broken')
    );

    console.log(
      '4. Сума як текст:',
      await post(
        url, config.INGEST_KEY,
        '{"category":"Кафе","amount":"100"}'
      )
    );

    // Відтворювані значення симулятора
    const random = signal.makeRandom(15);

    for (let step = 0; step < 4; step++) {
      for (const sensor of signal.SENSORS) {
        const amount = signal.generateValue(
          sensor, step, random
        );

        await post(
          url,
          config.INGEST_KEY,
          JSON.stringify({
            category: sensor.name,
            amount
          })
        );
      }
    }

    await new Promise(resolve =>
      setTimeout(resolve, 100)
    );

    console.log('Збережено записів:', records.length);
    console.log(
      'Аномальних сповіщень:',
      alertsSent.length
    );
    console.log('Тексти сповіщень:', alertsSent);
    console.log('✅ Тест завершено');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error('Помилка тесту:', error.message);
  process.exitCode = 1;
});

