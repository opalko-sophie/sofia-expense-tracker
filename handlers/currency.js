
const currencyService = require('../currency');

function formatMoney(value) {
  return value.toFixed(2);
}

module.exports = function registerCurrency(bot) {

  // Курс іноземної валюти до гривні
  bot.command('rate', async ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const code = parts[1]?.toUpperCase();

    if (
      parts.length !== 2 ||
      !/^[A-Z]{3}$/.test(code || '')
    ) {
      return ctx.reply(
        '❌ Формат: /rate USD\n' +
        'Введи трилітерний код валюти.'
      );
    }

    try {
      const rate = await currencyService.getRate(code);

      if (rate === null) {
        return ctx.reply(
          `❌ Валюту ${code} не знайдено.`
        );
      }

      return ctx.reply(
        `💱 Офіційний курс НБУ\n` +
        `1 ${rate.currency} = ${rate.rate.toFixed(4)} грн\n` +
        `Дата курсу: ${rate.date}`
      );
    } catch (error) {
      console.error('rate:', error.message);

      return ctx.reply(
        '⚠️ Не вдалося отримати курс валют. ' +
        'Спробуй пізніше.'
      );
    }
  });

  // Конвертація іноземної валюти в гривні
  bot.command('convert', async ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);

    const amountText = parts[1]?.replace(',', '.');
    const amount = Number(amountText);
    const code = parts[2]?.toUpperCase();

    if (
      parts.length !== 3 ||
      !/^\d+(?:\.\d{1,2})?$/.test(amountText || '') ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !/^[A-Z]{3}$/.test(code || '')
    ) {
      return ctx.reply(
        '❌ Формат: /convert 100 USD\n' +
        'Сума має бути додатним числом.'
      );
    }

    try {
      const result = await currencyService.convertToUAH(
        amount, code
      );

      if (result === null) {
        return ctx.reply(
          `❌ Валюту ${code} не знайдено.`
        );
      }

      return ctx.reply(
        `💰 Конвертація за курсом НБУ\n` +
        `${formatMoney(result.amount)} ${result.currency}` +
        ` = ${formatMoney(result.result)} грн\n` +
        `Курс: ${result.rate.toFixed(4)} грн\n` +
        `Дата курсу: ${result.date}`
      );
    } catch (error) {
      console.error('convert:', error.message);

      return ctx.reply(
        '⚠️ Не вдалося виконати конвертацію. ' +
        'Спробуй пізніше.'
      );
    }
  });
};

