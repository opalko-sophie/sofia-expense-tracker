
const storage = require('../storage');
const { REPORT_TIME } = require('../config');
const { SAVE_FAILED_TEXT } = require('../utils/format');

// Перевірка кількості хвилин
function parseMinutes(text) {
  if (!/^[1-9]\d*$/.test(text || '')) {
    return null;
  }

  const minutes = Number(text);

  if (!Number.isSafeInteger(minutes) || minutes > 10080) {
    return null;
  }

  return minutes;
}

function formatReminder(reminder) {
  const when = new Date(reminder.dueAt)
    .toLocaleString('uk-UA', {
      timeZone: 'Europe/Kyiv'
    });

  return `#${reminder.id} · ${when} · ${reminder.text}`;
}

module.exports = function registerReminders(bot) {

  // Підписка на щоденний звіт
  bot.command('daily', ctx => {
    try {
      const userId = ctx.from.id;

      if (storage.isSubscribed(userId)) {
        storage.removeSubscriber(userId);

        return ctx.reply(
          '🔕 Щоденний звіт вимкнено.'
        );
      }

      storage.addSubscriber(userId);

      return ctx.reply(
        `📊 Щоденний звіт увімкнено!\n` +
        `Час надсилання: ${REPORT_TIME} за Києвом.`
      );
    } catch (error) {
      console.error('daily:', error.message);
      return ctx.reply(SAVE_FAILED_TEXT);
    }
  });

  // Створення нагадування
  bot.command('remind', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const minutes = parseMinutes(parts[1]);
    const text = parts.slice(2).join(' ').trim();

    if (
      minutes === null ||
      text.length === 0 ||
      text.length > 200
    ) {
      return ctx.reply(
        '❌ Формат: /remind 1 Перевірити витрати\n' +
        'Від 1 до 10080 хвилин.\n' +
        'Текст — максимум 200 символів.'
      );
    }

    const dueAt = new Date(
      Date.now() + minutes * 60 * 1000
    ).toISOString();

    try {
      const reminder = storage.addReminder(
        ctx.from.id,
        text,
        dueAt
      );

      return ctx.reply(
        '✅ Нагадаю:\n' + formatReminder(reminder)
      );
    } catch (error) {
      console.error('remind:', error.message);
      return ctx.reply(SAVE_FAILED_TEXT);
    }
  });

  // Список активних нагадувань
  bot.command('reminders', ctx => {
    const items = storage.listUserReminders(ctx.from.id);

    if (items.length === 0) {
      return ctx.reply(
        'Активних нагадувань немає.\n' +
        'Додай: /remind 1 Перевірити витрати'
      );
    }

    return ctx.reply(
      '⏰ Твої нагадування:\n' +
      items.slice(0, 15).map(formatReminder).join('\n')
    );
  });
};

