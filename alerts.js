
const config = require('./config');
const { formatExpense } = require('./utils/format');
const { broadcast } = require('./broadcast');

function checkExpense(bot, record) {
  const amount = record.amount;

  if (
    amount >= config.ALERT_MIN &&
    amount <= config.ALERT_MAX
  ) {
    return;
  }

  const text =
    '⚠️ Аномальна витрата!\n' +
    formatExpense(record) +
    '\nДопустимий діапазон: ' +
    `${config.ALERT_MIN}–${config.ALERT_MAX} грн`;

  broadcast(bot, 'alert', text).catch(error => {
    console.error(
      'Помилка сповіщення:',
      error.message
    );
  });
}

module.exports = { checkExpense };

