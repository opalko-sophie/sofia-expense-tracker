const expenseAlerts = require('../alerts');

const path = require('path');
const { labels, menu } = require('../keyboards');
const { userStates } = require('../state');
const {
  parseNumber, parseId, isNonEmpty,
  parseJson, parseHours, isValidDate
} = require('../utils/validators');

const storage = require('../storage');
const csv = require('../utils/csv');
const {
  NOT_FOUND_TEXT, SAVE_FAILED_TEXT,
  formatExpense, formatImportReport,
  formatPeriodReport
} = require('../utils/format');

const IMPORT_FILE = path.join(
  __dirname, '..', 'import', 'expenses.csv'
);

module.exports = function registerCommands(bot) {

  const startAdd = ctx => {
    userStates.set(ctx.from.id, { step: 'amount' });
    return ctx.reply(
      '➕ Введи суму витрати. Для виходу: /cancel'
    );
  };

  const summary = ctx => ctx.reply(
    '📊 Для перегляду витрат введи /list.'
  );

  const limit = ctx => ctx.reply(
    '🎯 Перевірка ліміту: /check 600 550'
  );

  const alerts = ctx => ctx.reply(
    '🔔 Попередження про ліміт: /check 600 550'
  );

  const help = ctx => ctx.reply(
    'Доступні команди:\n' +
    '/start — головне меню\n' +
    '/add — покрокове додавання витрати\n' +
    '/add Продукти 250 — швидке додавання\n' +
    '/list — останні 10 витрат\n' +
    '/get 1 — перегляд витрати\n' +
    '/edit 1 300 — редагування суми\n' +
    '/del 1 — видалення\n' +
    '/import — імпорт CSV\n' +
    '/time — поточний час\n' +
    '/last — витрати за 24 години\n' +
    '/last 6 — витрати за 6 годин\n' +
    '/day 29.10.2026 — витрати за добу\n' +
    '/register — реєстрація\n' +
    '/me — мій профіль\n' +
    '/check 250 — оцінка витрати\n' +
    '/profile — Telegram-профіль\n' +
    '/data — перевірка JSON\n' +
    '/cancel — скасування\n' +
    '/help — допомога'
  );

  bot.start(ctx => {
    userStates.delete(ctx.from.id);
    return ctx.reply('Привіт! 👋 Обери дію:', menu);
  });

  bot.command('cancel', ctx => {
    userStates.delete(ctx.from.id);
    return ctx.reply('Діалог скасовано.', menu);
  });

  bot.command('summary', summary);
  bot.command('limit', limit);
  bot.command('alerts', alerts);
  bot.command('help', help);

  // ЛАБА 12 — поточний час
  bot.command('time', ctx => {
    const now = new Date();
    const kyiv = now.toLocaleString('uk-UA', {
      timeZone: 'Europe/Kyiv'
    });

    return ctx.reply(
      `🕒 Зараз у Києві: ${kyiv}\n` +
      `UTC: ${now.toISOString()}`
    );
  });

  // ЛАБА 12 — останні N годин
  bot.command('last', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const hours = parseHours(parts[1]);

    if (parts.length > 2 || hours === null) {
      return ctx.reply(
        '❌ Формат: /last 24\n' +
        'Введи кількість годин від 0 до 720.\n' +
        'Без числа — останні 24 години.'
      );
    }

    const items = storage.listExpensesLastHours(
      ctx.from.id, hours
    );

    return ctx.reply(
      formatPeriodReport(
        `За останні ${hours} год`,
        items
      )
    );
  });

  // ЛАБА 12 — календарна доба Києва
  bot.command('day', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const dayText = parts[1];

    if (parts.length !== 2 || !isValidDate(dayText)) {
      return ctx.reply(
        '❌ Формат: /day ДД.ММ.РРРР\n' +
        'Наприклад: /day 29.10.2026'
      );
    }

    const items = storage.listExpensesByDay(
      ctx.from.id, dayText
    );

    return ctx.reply(
      formatPeriodReport(`За ${dayText}`, items)
    );
  });

  // Реєстрація
  bot.command('register', ctx => {
    userStates.set(ctx.from.id, {
      step: 'register_name'
    });
    return ctx.reply('Введи своє ім’я.');
  });

  bot.command('me', ctx => {
    const user = storage.getUser(ctx.from.id);

    if (!user) {
      return ctx.reply(
        'Ти ще не зареєстрована. Напиши /register.'
      );
    }

    const since = new Date(user.createdAt)
      .toLocaleString('uk-UA', {
        timeZone: 'Europe/Kyiv'
      });

    return ctx.reply(
      `👤 Ім’я: ${user.name}\n` +
      `Роль: ${user.role}\n` +
      `Зареєстровано: ${since}`
    );
  });

  // CREATE
  bot.command('add', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);

    if (parts.length === 1) {
      return startAdd(ctx);
    }

    const category = parts[1];
    const amount = parseNumber(parts[2]);

    if (
      parts.length !== 3 ||
      !isNonEmpty(category) ||
      amount === null
    ) {
      return ctx.reply('❌ Формат: /add Продукти 250');
    }

    try {
      const record = storage.addExpense(
        ctx.from.id, category, amount
      );
      expenseAlerts.checkExpense(bot, record);
      return ctx.reply(
        '✅ Додано: ' + formatExpense(record)
      );
    } catch (error) {
      console.error('add:', error.message);
      return ctx.reply(SAVE_FAILED_TEXT);
    }
  });

  // READ — список
  bot.command('list', ctx => {
    const items = storage.listExpenses(ctx.from.id);

    if (items.length === 0) {
      return ctx.reply(
        'Записів ще немає. Додай: /add Продукти 250'
      );
    }

    return ctx.reply(
      '📊 Останні витрати:\n' +
      items.map(formatExpense).join('\n')
    );
  });

  // READ — один запис
  bot.command('get', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const id = parseId(parts[1]);

    if (parts.length !== 2 || id === null) {
      return ctx.reply('Формат: /get 1');
    }

    const record = storage.getExpense(
      id, ctx.from.id
    );

    return ctx.reply(
      record ? formatExpense(record) : NOT_FOUND_TEXT
    );
  });

  // UPDATE
  bot.command('edit', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const id = parseId(parts[1]);
    const amount = parseNumber(parts[2]);

    if (
      parts.length !== 3 ||
      id === null ||
      amount === null
    ) {
      return ctx.reply('Формат: /edit 1 300');
    }

    try {
      const record = storage.updateExpense(
        id, ctx.from.id, amount
      );

      return ctx.reply(
        record
          ? '✅ Оновлено: ' + formatExpense(record)
          : NOT_FOUND_TEXT
      );
    } catch (error) {
      console.error('edit:', error.message);
      return ctx.reply(SAVE_FAILED_TEXT);
    }
  });

  // DELETE
  bot.command('del', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const id = parseId(parts[1]);

    if (parts.length !== 2 || id === null) {
      return ctx.reply('Формат: /del 1');
    }

    const record = storage.getExpense(id, ctx.from.id);

    if (!record) {
      return ctx.reply(NOT_FOUND_TEXT);
    }

    userStates.set(ctx.from.id, {
      step: 'confirm_delete',
      recordId: id
    });

    return ctx.reply(
      '🗑️ Видалити ' + formatExpense(record) +
      '?\nНапиши «так» або /cancel.'
    );
  });

  // Імпорт CSV — лабораторна 11
  bot.command('import', ctx => {
    let text;

    try {
      text = csv.readCsvFile(IMPORT_FILE);
    } catch (error) {
      console.error('import read:', error.message);
      return ctx.reply(
        '❌ Не вдалося прочитати CSV-файл.'
      );
    }

    if (text === null) {
      return ctx.reply(
        '❌ Файл не знайдено: import/expenses.csv'
      );
    }

    let result;

    try {
      result = csv.expensesFromCsv(text);
    } catch (error) {
      console.error('import parse:', error.message);
      return ctx.reply('❌ Помилка обробки CSV.');
    }

    if (result.good.length === 0) {
      return ctx.reply(
        formatImportReport(0, result.errors) +
        '\nНемає коректних записів.'
      );
    }

    if (result.good.length > 500) {
      return ctx.reply('❌ Максимум 500 записів.');
    }

    try {
      const count = storage.addManyExpenses(
        ctx.from.id, result.good
      );
      return ctx.reply(
        formatImportReport(count, result.errors)
      );
    } catch (error) {
      console.error('import save:', error.message);
      return ctx.reply(SAVE_FAILED_TEXT);
    }
  });

  // Порогова логіка — лабораторна 6
  bot.command('check', ctx => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const amount = parseNumber(parts[1]);
    const spendingLimit = parts.length === 3
      ? parseNumber(parts[2]) : null;

    if (
      parts.length < 2 ||
      parts.length > 3 ||
      amount === null ||
      (parts.length === 3 && spendingLimit === null)
    ) {
      return ctx.reply(
        '❌ Некоректні дані. Приклад: /check 250'
      );
    }

    if (
      amount > 500 &&
      spendingLimit !== null &&
      amount > spendingLimit
    ) {
      return ctx.reply(
        '🚨 Критично! Висока витрата та перевищено ліміт!'
      );
    } else if (amount <= 100) {
      return ctx.reply('🟢 Низька витрата.');
    } else if (amount <= 500) {
      return ctx.reply('🟡 Помірна витрата.');
    } else {
      return ctx.reply('🔴 Висока витрата.');
    }
  });

  bot.command('profile', ctx => {
    try {
      return ctx.reply(
        '👤 Username: @' +
        ctx.from.username.toUpperCase()
      );
    } catch (error) {
      console.error('profile:', error.message);
      return ctx.reply(
        'У тебе не встановлено username.'
      );
    }
  });

  bot.command('data', ctx => {
    const text = ctx.message.text
      .replace(/^\/data(?:@\w+)?/, '').trim();
    const data = parseJson(text);

    return ctx.reply(
      data === null
        ? '❌ Некоректний JSON.'
        : '✅ JSON: ' + JSON.stringify(data)
    );
  });

  // Кнопки меню
  bot.hears(labels.add, startAdd);
  bot.hears(labels.summary, summary);
  bot.hears(labels.limit, limit);
  bot.hears(labels.alerts, alerts);
  bot.hears(labels.help, help);
};

