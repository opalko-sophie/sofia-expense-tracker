
const { parseHours, parseCount } =
  require('../utils/validators');

const storage = require('../storage');
const stats = require('../utils/stats');

const {
  formatExpense,
  formatStatsReport
} = require('../utils/format');

module.exports = function registerReports(bot) {

  // ЛАБА 13 — статистика за категоріями
  bot.command('report', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const hours = parseHours(parts[1]);

    if (parts.length > 2 || hours === null) {
      return ctx.reply(
        '❌ Формат: /report 24\n' +
        'Введи кількість годин від 0 до 720.\n' +
        'Без числа — останні 24 години.'
      );
    }

    const records = storage.listExpensesLastHours(
      ctx.from.id,
      hours
    );

    return ctx.reply(
      formatStatsReport(
        `За останні ${hours} год`,
        records
      )
    );
  });

  // ЛАБА 13 — найбільші витрати
  bot.command('top', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const count = parseCount(parts[1]);

    if (parts.length > 2 || count === null) {
      return ctx.reply(
        '❌ Формат: /top 5\n' +
        'Кількість від 1 до 20.\n' +
        'Без числа — 5.'
      );
    }

    // Усі витрати користувача, не лише останні 10
    const records = storage.listExpensesLastHours(
      ctx.from.id,
      24 * 365 * 100
    );

    const top = stats.topValues(records, count);

    if (top.length === 0) {
      return ctx.reply('Записів ще немає.');
    }

    return ctx.reply(
      '🏆 Найбільші витрати:\n' +
      top.map(formatExpense).join('\n')
    );
  });
};

