
const config = require('./config');
const signal = require('./utils/signal');
const outbox = require('./utils/outbox');

const MAX_QUEUE = 100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Надсилання витрати через HTTP
async function sendReading(reading) {
  const response = await fetch(config.INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.INGEST_KEY
    },
    body: JSON.stringify(reading),
    signal: AbortSignal.timeout(config.HTTP_TIMEOUT_MS)
  });

  if (!response.ok) {
    const error = new Error(
      'Бот відповів помилкою ' + response.status
    );

    error.status = response.status;
    throw error;
  }

  return await response.json();
}

// Симулятор із чергою повторного надсилання
async function main() {
  const seconds = Number(process.argv[2]) || 2;
  const ticks = Number(process.argv[3]) || 0;
  const seed = Number(process.argv[4]) || 15;

  const random = signal.makeRandom(seed);
  const queue = [];

  let step = 0;

  console.log(
    '📡 Симулятор запущено. Інтервал: ' +
    seconds + ' с'
  );

  while (ticks === 0 || step < ticks) {
    const values = [];
    let lost = 0;

    for (const sensor of signal.SENSORS) {
      const amount = signal.generateValue(
        sensor, step, random
      );

      values.push(
        `${sensor.name}: ${amount} грн`
      );

      // Час створення запису — до надсилання
      const reading = {
        category: sensor.name,
        amount,
        time: new Date().toISOString()
      };

      lost += outbox.addToQueue(
        queue,
        reading,
        MAX_QUEUE
      );
    }

    if (lost > 0) {
      console.error(
        `⚠️ Черга переповнена: втрачено ${lost} записів`
      );
    }

    // Намагаємося надіслати всю чергу
    const result = await outbox.flushQueue(
      queue,
      sendReading
    );

    let message =
      `#${step} ${values.join(', ')}` +
      ` → надіслано ${result.sent},` +
      ` у черзі ${result.left}`;

    if (result.dropped > 0) {
      message +=
        `, відхилено ${result.dropped}`;
    }

    if (result.error !== null) {
      message += ` (${result.error})`;
    }

    console.log(message);

    step++;

    if (ticks === 0 || step < ticks) {
      await sleep(seconds * 1000);
    }
  }

  // Фінальна спроба перед завершенням
  if (queue.length > 0) {
    const result = await outbox.flushQueue(
      queue,
      sendReading
    );

    console.log(
      `Фінальна відправка: ${result.sent},` +
      ` залишилося ${result.left}`
    );
  }

  console.log(
    `✅ Симулятор завершив роботу.` +
    ` У черзі залишилося: ${queue.length}`
  );
}

main().catch(error => {
  console.error(
    'Помилка симулятора:',
    error.message
  );

  process.exitCode = 1;
});

