const expenseAlerts = require('../alerts');

const { userStates } = require('../state');
const { menu } = require('../keyboards');
const { parseNumber, isNonEmpty } = require('../utils/validators');
const storage = require('../storage');
const {
  NOT_FOUND_TEXT,
  SAVE_FAILED_TEXT,
  formatExpense
} = require('../utils/format');

module.exports = function registerDialog(bot) {
  bot.on('text', ctx => {
    const text = ctx.message.text.trim();
    const id = ctx.from.id;
    const state = userStates.get(id);

    if (!state) {
      return ctx.reply(
        'Обери дію з меню або введи /help.',
        menu
      );
    }

    // ЛАБА 10 — підтвердження видалення
    if (state.step === 'confirm_delete') {
      if (text.toLowerCase() !== 'так') {
        return ctx.reply(
          'Напиши «так» для видалення або /cancel.'
        );
      }

      userStates.delete(id);

      try {
        const record = storage.deleteExpense(
          state.recordId, id
        );

        if (record === null) {
          return ctx.reply(NOT_FOUND_TEXT, menu);
        }

        return ctx.reply(
          '🗑️ Видалено: ' + formatExpense(record),
          menu
        );
      } catch (error) {
        console.error('delete:', error.message);
        return ctx.reply(SAVE_FAILED_TEXT, menu);
      }
    }

    // ЛАБА 9 — введення імені
    if (state.step === 'register_name') {
      if (!isNonEmpty(text)) {
        return ctx.reply(
          '❌ Введи коректне ім’я до 60 символів.'
        );
      }

      state.name = text;
      state.step = 'register_role';

      return ctx.reply('Вкажи свою роль.');
    }

    // ЛАБА 9 — введення ролі
    if (state.step === 'register_role') {
      if (!isNonEmpty(text)) {
        return ctx.reply(
          '❌ Введи коректну роль до 60 символів.'
        );
      }

      state.role = text;
      state.step = 'register_confirm';

      return ctx.reply(
        'Підтвердити реєстрацію?\n' +
        `Ім’я: ${state.name}\n` +
        `Роль: ${state.role}\n` +
        'Напиши «так» або «ні».'
      );
    }

    // ЛАБА 9 — збереження реєстрації
    if (state.step === 'register_confirm') {
      const answer = text.toLowerCase();

      if (answer === 'ні') {
        userStates.delete(id);
        return ctx.reply('Реєстрацію скасовано.', menu);
      }

      if (answer !== 'так') {
        return ctx.reply('Напиши «так», «ні» або /cancel.');
      }

      const ok = storage.saveUser(
        id, state.name, state.role
      );

      userStates.delete(id);

      if (!ok) {
        return ctx.reply(SAVE_FAILED_TEXT, menu);
      }

      return ctx.reply(
        '✅ Реєстрацію збережено! Перевір /me.',
        menu
      );
    }

    // ЛАБА 5 — введення суми витрати
    if (state.step === 'amount') {
      const amount = parseNumber(text);

      if (amount === null) {
        return ctx.reply(
          '❌ Введи додатну суму, наприклад 250.'
        );
      }

      state.amount = amount;
      state.step = 'category';

      return ctx.reply(
        'Введи категорію витрати, наприклад Продукти.'
      );
    }

    // ЛАБА 5 — введення категорії
    if (state.step === 'category') {
      if (!isNonEmpty(text)) {
        return ctx.reply(
          '❌ Некоректна категорія. Максимум 60 символів.'
        );
      }

      state.category = text;
      state.step = 'confirm';

      return ctx.reply(
        'Підтвердити витрату?\n' +
        `Сума: ${state.amount.toFixed(2)} грн\n` +
        `Категорія: ${state.category}\n` +
        'Напиши «так» або «ні».'
      );
    }

    // ЛАБА 10 — збереження витрати в JSON
    if (state.step === 'confirm') {
      const answer = text.toLowerCase();

      if (answer === 'ні') {
        userStates.delete(id);
        return ctx.reply(
          'Витрату не підтверджено.',
          menu
        );
      }

      if (answer !== 'так') {
        return ctx.reply('Напиши «так», «ні» або /cancel.');
      }

      userStates.delete(id);

      try {
        const record = storage.addExpense(
          id, state.category, state.amount
        );
        expenseAlerts.checkExpense(bot, record);

        return ctx.reply(
          '✅ Додано: ' + formatExpense(record),
          menu
        );
      } catch (error) {
        console.error('addExpense:', error.message);
        return ctx.reply(SAVE_FAILED_TEXT, menu);
      }
    }

    userStates.delete(id);

    return ctx.reply(
      'Діалог скинуто. Почни з /start.',
      menu
    );
  });
};

