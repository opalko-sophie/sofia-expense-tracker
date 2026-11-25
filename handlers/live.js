
const storage = require('../storage');
const { formatAgo } = require('../utils/format');

module.exports = function registerLive(bot) {
  bot.command('live', ctx => {
    const records = storage.listExpensesLastHours(
      0, 24 * 365 * 100
    );

    const latest = new Map();

    for (const record of records) {
      if (!latest.has(record.category)) {
        latest.set(record.category, record);
      }
    }

    if (latest.size === 0) {
      return ctx.reply(
        'Показань ще немає. Запусти симулятор.'
      );
    }

    let text = '📡 Останні дані симулятора:';
    let shown = 0;

    for (const [category, record] of latest) {
      if (shown >= 10) break;

      text +=
        `\n${category}: ${record.amount.toFixed(2)} грн` +
        ` (${formatAgo(record.createdAt)})`;

      shown++;
    }

    return ctx.reply(text);
  });
};

