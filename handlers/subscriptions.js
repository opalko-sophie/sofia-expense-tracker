
const config = require('../config');
const storage = require('../storage');
const { broadcast } = require('../broadcast');
const { SAVE_FAILED_TEXT } = require('../utils/format');

// Перевірка теми підписки
function isTopic(name) {
  for (const topic in config.TOPICS) {
    if (topic === name) return true;
  }
  return false;
}

// Список доступних тем
function topicsText() {
  let text = '';

  for (const topic in config.TOPICS) {
    text += `\n${topic} — ${config.TOPICS[topic]}`;
  }

  return text;
}

module.exports = function registerSubscriptions(bot) {

  // Власний Telegram ID
  bot.command('id', ctx => {
    return ctx.reply(
      `Твій Telegram ID: ${ctx.from.id}`
    );
  });

  // Підписка на тему
  bot.command('subscribe', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const topic = parts[1];

    if (parts.length !== 2 || !isTopic(topic)) {
      return ctx.reply(
        'Формат: /subscribe <тема>\nТеми:' +
        topicsText()
      );
    }

    try {
      storage.addSubscriber(topic, ctx.from.id);

      return ctx.reply(
        `✅ Підписано: ${config.TOPICS[topic]}.`
      );
    } catch (error) {
      console.error('subscribe:', error.message);
      return ctx.reply(SAVE_FAILED_TEXT);
    }
  });

  // Відписка від теми
  bot.command('unsubscribe', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const topic = parts[1];

    if (parts.length !== 2 || !isTopic(topic)) {
      return ctx.reply(
        'Формат: /unsubscribe <тема>\nТеми:' +
        topicsText()
      );
    }

    try {
      storage.removeSubscriber(topic, ctx.from.id);

      return ctx.reply(
        `🔕 Відписано: ${config.TOPICS[topic]}.`
      );
    } catch (error) {
      console.error('unsubscribe:', error.message);
      return ctx.reply(SAVE_FAILED_TEXT);
    }
  });

  // Перегляд підписок
  bot.command('subscriptions', ctx => {
    let text = '📋 Твої підписки:';

    for (const topic in config.TOPICS) {
      const active = storage.isSubscribed(
        topic, ctx.from.id
      );

      text +=
        `\n${active ? '✅' : '❌'} ${topic}` +
        ` — ${config.TOPICS[topic]}`;
    }

    return ctx.reply(text);
  });

  // Розсилка адміністратора
  bot.command('broadcast', async ctx => {
    if (
      config.ADMIN_ID === null ||
      ctx.from.id !== config.ADMIN_ID
    ) {
      return ctx.reply(
        '⛔ Ця команда лише для адміністратора.'
      );
    }

    const text = ctx.message.text
      .replace(/^\/broadcast(?:@\w+)?/, '')
      .trim();

    if (!text || text.length > 1000) {
      return ctx.reply(
        'Формат: /broadcast <текст>\n' +
        'Максимум 1000 символів.'
      );
    }

    try {
      const total = storage.listSubscribers('news').length;

      await ctx.reply(
        `📢 Розсилку запущено. Підписників: ${total}`
      );

      const result = await broadcast(
        bot, 'news', '📢 ' + text
      );

      return ctx.reply(
        `✅ Розсилку завершено.\n` +
        `Доставлено: ${result.delivered}\n` +
        `Помилок: ${result.failed}`
      );
    } catch (error) {
      console.error('broadcast:', error.message);
      return ctx.reply(
        '❌ Не вдалося завершити розсилку.'
      );
    }
  });
};

