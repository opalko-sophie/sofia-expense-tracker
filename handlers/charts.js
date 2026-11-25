
const storage = require('../storage');
const chart = require('../utils/chart');
const { parseHours } = require('../utils/validators');
const { ALERT_MIN, ALERT_MAX } = require('../config');

function pointsFor(hours, category) {
  const records = storage.listExpensesLastHours(0, hours);

  if (!category && records.length > 0) {
    category = records[0].category;
  }

  const points = [];

  for (const record of records) {
    if (record.category === category) {
      points.push({
        time: new Date(record.createdAt).getTime(),
        value: record.amount
      });
    }
  }

  points.sort((a, b) => a.time - b.time);

  return { category, points };
}

module.exports = function registerCharts(bot) {

  // Текстова діаграма
  bot.command('trend', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const hours = parseHours(parts[1]);

    if (hours === null) {
      return ctx.reply(
        '❌ Формат: /trend 24 Продукти'
      );
    }

    const category = parts.slice(2).join(' ');
    const found = pointsFor(hours, category);

    if (found.points.length < 2) {
      return ctx.reply(
        'Для діаграми потрібно мінімум 2 записи.'
      );
    }

    const reduced = chart.downsample(found.points, 30);
    const values = reduced.map(p => p.value);

    const allValues = found.points.map(p => p.value);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    return ctx.reply(
      `📈 ${found.category}\n` +
      `За ${hours} год · записів: ${found.points.length}\n` +
      chart.sparkline(values) + '\n' +
      `Мінімум: ${min.toFixed(2)} грн\n` +
      `Максимум: ${max.toFixed(2)} грн`
    );
  });

  // PNG-графік
  bot.command('chart', async ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const hours = parseHours(parts[1]);

    if (hours === null) {
      return ctx.reply(
        '❌ Формат: /chart 24 Продукти'
      );
    }

    const category = parts.slice(2).join(' ');
    const found = pointsFor(hours, category);

    if (found.points.length < 2) {
      return ctx.reply(
        'Для графіка потрібно мінімум 2 записи.'
      );
    }

    try {
      const points = chart.downsample(found.points, 300);

      const image = chart.chartToPng(points, {
        min: ALERT_MIN,
        max: ALERT_MAX
      });

      return await ctx.replyWithPhoto(
        { source: image },
        {
          caption:
            `📈 ${found.category}\n` +
            `За ${hours} год · показань: ${found.points.length}\n` +
            '🟢 Мінімум · 🔴 Максимум'
        }
      );
    } catch (error) {
      console.error('chart:', error.message);

      return ctx.reply(
        '❌ Не вдалося побудувати графік.'
      );
    }
  });
};

