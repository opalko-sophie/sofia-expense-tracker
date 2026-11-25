
const scheduler = require('./scheduler');
const storage = require('./storage');
const { REPORT_TIME } = require('./config');

async function main() {
  if (REPORT_TIME !== '08:00') {
    console.log('Спочатку встанови REPORT_TIME = 08:00');
    return;
  }

  // Тестуємо без змін справжнього data.json
  let lastReportDay = '';
  let reminders = [{
    id: 1,
    userId: 111,
    text: 'Перевірити витрати',
    dueAt: '2026-10-22T04:59:00.000Z'
  }];

  storage.getLastReportDay = () => lastReportDay;
  storage.setLastReportDay = day => {
    lastReportDay = day;
  };
  storage.listSubscribers = () => [111];
  storage.listExpensesLastHours = () => [];
  storage.listDueReminders = now =>
    reminders.filter(r => Date.parse(r.dueAt) <= now);
  storage.removeReminder = id => {
    reminders = reminders.filter(r => r.id !== id);
  };

  const sent = [];
  const fakeBot = {
    telegram: {
      sendMessage: async (id, text) => {
        sent.push({ id, text });
      }
    }
  };

  const before = new Date('2026-10-22T04:59:00Z');
  const atTime = new Date('2026-10-22T05:00:00Z');
  const after = new Date('2026-10-22T05:01:00Z');

  await scheduler.tick(fakeBot, before);
  console.log(
    '07:59 → звітів:',
    sent.filter(x => x.text.includes('Щоденний звіт')).length
  );

  await scheduler.tick(fakeBot, atTime);
  console.log(
    '08:00 → звітів:',
    sent.filter(x => x.text.includes('Щоденний звіт')).length
  );

  await scheduler.tick(fakeBot, after);
  console.log(
    '08:01 → звітів:',
    sent.filter(x => x.text.includes('Щоденний звіт')).length
  );

  console.log(
    'Нагадувань надіслано:',
    sent.filter(x => x.text.includes('Нагадування')).length
  );

  console.log('✅ Перевірку завершено');
}

main().catch(console.error);

