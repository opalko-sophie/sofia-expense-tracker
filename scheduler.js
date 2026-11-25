
const config = require('./config');
const storage = require('./storage');
const { formatStatsReport } = require('./utils/format');

// Київський час
function kyivTime(date) {
  return date.toLocaleTimeString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
}

// Київська дата
function kyivDay(date) {
  return date.toLocaleDateString('uk-UA', {
    timeZone: 'Europe/Kyiv'
  });
}

// Безпечне надсилання
async function sendSafe(bot, userId, text) {
  try {
    await bot.telegram.sendMessage(userId, text);
  } catch (error) {
    console.error('Помилка надсилання:', error.message);

    if (error.code === 403) {
      try {
        storage.removeSubscriber(userId);
      } catch (saveError) {
        console.error(
          'Помилка видалення підписника:',
          saveError.message
        );
      }
    }
  }
}

// Перевірка нагадувань
async function checkReminders(bot, now) {
  const due = storage.listDueReminders(now.getTime());

  for (const reminder of due) {
    // Видаляємо до надсилання, щоб не дублювати
    storage.removeReminder(reminder.id);

    await sendSafe(
      bot,
      reminder.userId,
      '⏰ Нагадування: ' + reminder.text
    );
  }
}

// Щоденний звіт
async function checkDailyReport(bot, now) {
  const today = kyivDay(now);

  if (storage.getLastReportDay() === today) {
    return;
  }

  if (kyivTime(now) < config.REPORT_TIME) {
    return;
  }

  const subscribers = storage.listSubscribers();

  if (subscribers.length === 0) {
    return;
  }

  // Запам'ятовуємо дату до відправлення
  storage.setLastReportDay(today);

  for (const userId of subscribers) {
    const records = storage.listExpensesLastHours(
      userId,
      24
    );

    const report = formatStatsReport(
      'Щоденний звіт за 24 години',
      records
    );

    await sendSafe(bot, userId, report);
  }
}

// Один цикл планувальника
async function tick(bot, now = new Date()) {
  try {
    await checkReminders(bot, now);
    await checkDailyReport(bot, now);
  } catch (error) {
    console.error('Планувальник:', error.message);
  }
}

// Запуск одного таймера на хвилину
function start(bot) {
  tick(bot, new Date());

  return setInterval(() => {
    tick(bot, new Date());
  }, 60 * 1000);
}

module.exports = {
  start,
  tick,
  kyivTime,
  kyivDay
};

