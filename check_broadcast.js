
const { broadcast } = require('./broadcast');
const storage = require('./storage');

storage.loadData();

const received = [];

const fakeBot = {
  telegram: {
    sendMessage: async (userId, text) => {
      if (userId === 3) {
        const error = new Error(
          'Forbidden: bot was blocked by the user'
        );
        error.code = 403;
        throw error;
      }

      if (userId === 5) {
        throw new Error('Мережа недоступна');
      }

      received.push(userId);
    }
  }
};

async function main() {
  const testIds = [1, 2, 3, 4, 5];

  try {
    for (const id of testIds) {
      storage.addSubscriber('news', id);
    }

    const start = Date.now();

    const result = await broadcast(
      fakeBot,
      'news',
      'Тестова розсилка'
    );

    const elapsed = Date.now() - start;

    console.log(
      'Доставлено:', result.delivered,
      '| помилок:', result.failed
    );

    console.log('Отримали:', received);

    console.log(
      'Підписники після розсилки:',
      storage.listSubscribers('news')
    );

    console.log(
      'Пауза не менше 200 мс:',
      elapsed >= 200
    );
  } finally {
    for (const id of testIds) {
      storage.removeSubscriber('news', id);
    }

    console.log('✅ Тест завершено');
  }
}

main().catch(error => {
  console.error('Помилка тесту:', error.message);
  process.exitCode = 1;
});

