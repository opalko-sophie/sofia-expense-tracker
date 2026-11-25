
const config = require('./config');
const storage = require('./storage');

// Пауза між повідомленнями
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Безпечна розсилка
async function broadcast(bot, topic, text) {
  const ids = storage.listSubscribers(topic);
  let delivered = 0;
  let failed = 0;

  for (const userId of ids) {
    try {
      await bot.telegram.sendMessage(userId, text);
      delivered++;
    } catch (error) {
      failed++;

      console.error(
        `Помилка надсилання користувачу ${userId}:`,
        error.message
      );

      // Якщо користувач заблокував бота
      if (error.code === 403 ||
          error.response?.error_code === 403) {
        try {
          storage.removeSubscriber(topic, userId);
        } catch (saveError) {
          console.error(
            'Помилка відписки:',
            saveError.message
          );
        }
      }
    }

    // Чекаємо перед наступним повідомленням
    await sleep(config.BROADCAST_PAUSE_MS);
  }

  return { delivered, failed };
}

module.exports = { broadcast, sleep };

