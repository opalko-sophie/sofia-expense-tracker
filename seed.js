
const storage = require('./storage');

storage.loadData();

function hoursAgo(hours) {
  return new Date(
    Date.now() - hours * 60 * 60 * 1000
  ).toISOString();
}

const testExpenses = [
  { category: 'Тест-72год', amount: 72, createdAt: hoursAgo(72) },
  { category: 'Тест-48год', amount: 48, createdAt: hoursAgo(48) },
  { category: 'Тест-25год', amount: 25, createdAt: hoursAgo(25) },
  { category: 'Тест-23год', amount: 23, createdAt: hoursAgo(23) },
  { category: 'Тест-5год', amount: 5, createdAt: hoursAgo(5) },
  { category: 'Тест-1год', amount: 1, createdAt: hoursAgo(1) }
];

const count = storage.addManyExpenses(
  123456789,
  testExpenses
);

console.log(`✅ Додано ${count} тестових записів`);

