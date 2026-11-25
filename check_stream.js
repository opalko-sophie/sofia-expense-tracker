
const fs = require('fs');
const os = require('os');
const path = require('path');
const outbox = require('./utils/outbox');

const root = __dirname;
const temp = fs.mkdtempSync(
  path.join(root, '.stream_test_')
);

for (const name of ['config.js', 'storage.js', 'ingest.js']) {
  fs.copyFileSync(
    path.join(root, name),
    path.join(temp, name)
  );
}

fs.cpSync(
  path.join(root, 'utils'),
  path.join(temp, 'utils'),
  { recursive: true }
);

// Імітуємо сповіщення, без справжнього Telegram
fs.writeFileSync(
  path.join(temp, 'alerts.js'),
  'module.exports = { checkExpense() {} };'
);

const config = require(path.join(temp, 'config.js'));
config.INGEST_KEY = 'stream-test-key';
config.INGEST_PORT = 0;

const storage = require(path.join(temp, 'storage.js'));
const ingest = require(path.join(temp, 'ingest.js'));

storage.loadData();

const fakeBot = {
  telegram: {
    sendMessage: async () => {}
  }
};

let url;
let networkUp = false;
let loseResponses = 0;

function reading(category, amount, secondsAgo) {
  return {
    category,
    amount,
    time: new Date(
      Date.now() - secondsAgo * 1000
    ).toISOString()
  };
}

async function send(item) {
  if (!networkUp) {
    throw new TypeError('fetch failed');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.INGEST_KEY
    },
    body: JSON.stringify(item)
  });

  // Сервер уже отримав запис, але відповідь загубилась
  if (loseResponses > 0) {
    loseResponses--;
    throw new Error('timeout');
  }

  if (!response.ok) {
    const error = new Error('HTTP ' + response.status);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function valuesInDatabase() {
  const file = path.join(temp, 'data', 'data.json');

  if (!fs.existsSync(file)) {
    return [];
  }

  return JSON.parse(
    fs.readFileSync(file, 'utf8')
  ).expenses.map(record => record.amount);
}

async function main() {
  const server = ingest.start(fakeBot);

  try {
    if (!server.listening) {
      await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
      });
    }

    url = 'http://127.0.0.1:' +
      server.address().port + '/readings';

    const queue = [];

    // 1. Мережа недоступна
    outbox.addToQueue(queue, reading('Продукти', 20, 50), 10);
    outbox.addToQueue(queue, reading('Кафе', 18, 49), 10);
    outbox.addToQueue(queue, reading('Продукти', 21, 40), 10);
    outbox.addToQueue(queue, reading('Кафе', 19, 39), 10);

    console.log(
      '1. Немає мережі:',
      await outbox.flushQueue(queue, send)
    );

    // 2. З'єднання відновлено
    networkUp = true;

    console.log(
      '2. Мережа відновлена:',
      await outbox.flushQueue(queue, send)
    );
    console.log('   У базі:', valuesInDatabase());

    // 3. Загублена відповідь та повтор
    outbox.addToQueue(
      queue, reading('Продукти', 22, 30), 10
    );

    loseResponses = 1;

    console.log(
      '3. Відповідь загубилась:',
      await outbox.flushQueue(queue, send)
    );

    console.log(
      '   Повторна відправка:',
      await outbox.flushQueue(queue, send)
    );

    console.log(
      '   Без дубліката:',
      valuesInDatabase()
    );

    // 4. Запис надійшов із запізненням
    outbox.addToQueue(
      queue, reading('Продукти', 19, 45), 10
    );

    console.log(
      '4. Запізнілий запис:',
      await outbox.flushQueue(queue, send)
    );
    console.log(
      '   Порядок за часом:',
      valuesInDatabase()
    );

    // 5. Некоректний запис
    outbox.addToQueue(queue, {
      category: '',
      amount: 1,
      time: new Date().toISOString()
    }, 10);

    outbox.addToQueue(
      queue, reading('Кафе', 25, 5), 10
    );

    console.log(
      '5. Некоректний запис:',
      await outbox.flushQueue(queue, send)
    );

    // 6. Переповнення черги
    const small = [];
    let lost = 0;

    for (let i = 1; i <= 5; i++) {
      lost += outbox.addToQueue(
        small,
        reading('Продукти', i, 0),
        3
      );
    }

    console.log(
      '6. Переповнення: втрачено', lost,
      '| залишились:',
      small.map(item => item.amount)
    );

    console.log('✅ Усі тести виконано');

  } finally {
    if (server?.listening) {
      await new Promise(resolve => server.close(resolve));
    }

    fs.rmSync(temp, {
      recursive: true,
      force: true
    });
  }
}

main().catch(error => {
  console.error('❌ Помилка тесту:', error.message);
  process.exitCode = 1;
  fs.rmSync(temp, { recursive: true, force: true });
});

