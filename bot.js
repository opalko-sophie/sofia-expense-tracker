const registerCharts = require('./handlers/charts');
const registerLive = require('./handlers/live');
const ingest = require('./ingest');
const registerCurrency = require('./handlers/currency');
const registerSubscriptions = require('./handlers/subscriptions');
const scheduler = require('./scheduler');
const registerReminders = require('./handlers/reminders');

const { Telegraf } = require('telegraf');
const { BOT_TOKEN } = require('./config');
const { loadData } = require('./storage');
const registerCommands = require('./handlers/commands');
const registerDialog = require('./handlers/dialog');
const registerReports = require('./handlers/reports');

const bot = new Telegraf(BOT_TOKEN);

registerCommands(bot);
registerReports(bot);
registerReminders(bot);
registerSubscriptions(bot);
registerCurrency(bot);
registerLive(bot);
registerCharts(bot);
registerDialog(bot);

bot.catch(async (err, ctx) => {
  console.error('Помилка бота:', err);

  try {
    await ctx.reply(
      '⚠️ Щось пішло не так. Спробуй ще раз.'
    );
  } catch (error) {
    console.error('Помилка відповіді:', error);
  }
});

async function main() {
  try {
loadData();
    scheduler.start(bot);
    ingest.start(bot);
    await bot.launch();
    console.log('✅ Sofia Expense Tracker запущено!');
  } catch (error) {
    console.error('Не вдалося запустити бота:', error.message);
    process.exitCode = 1;
  }
}

main();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

