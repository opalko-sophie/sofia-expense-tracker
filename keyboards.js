
const { Markup } = require('telegraf');

const labels = {
  add: '➕ Додати витрату',
  summary: '📊 Підсумок',
  limit: '🎯 Ліміт',
  alerts: '🔔 Сповіщення',
  help: '❓ Допомога'
};

const menu = Markup.keyboard([
  [labels.add, labels.summary],
  [labels.limit, labels.alerts],
  [labels.help]
]).resize();

module.exports = { labels, menu };

