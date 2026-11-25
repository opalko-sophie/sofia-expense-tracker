
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'data.json');

let data = {
  users: {},
  expenses: [],
  lastExpenseId: 0
};

// Завантаження JSON
function loadBaseData() {
  let content;

  try {
    content = fs.readFileSync(DATA_FILE, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      data = { users: {}, expenses: [], lastExpenseId: 0 };
      return;
    }
    throw error;
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(
      'Файл data/data.json пошкоджений: ' + error.message
    );
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    !parsed.users ||
    typeof parsed.users !== 'object' ||
    Array.isArray(parsed.users)
  ) {
    throw new Error('Неправильна структура data.json');
  }

  const expenses = Array.isArray(parsed.expenses)
    ? parsed.expenses
    : [];

  const maxId = expenses.reduce(
    (max, item) => Math.max(max, Number(item.id) || 0),
    0
  );

  data = {
    users: parsed.users,
    expenses,
    lastExpenseId: Math.max(
      Number.isSafeInteger(parsed.lastExpenseId)
        ? parsed.lastExpenseId : 0,
      maxId
    )
  };
}

// Безпечний запис
function persist(next) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

  const tempFile = DATA_FILE + '.tmp';

  try {
    fs.writeFileSync(
      tempFile,
      JSON.stringify(next, null, 2),
      'utf8'
    );
    fs.renameSync(tempFile, DATA_FILE);
  } catch (error) {
    try {
      fs.unlinkSync(tempFile);
    } catch (_) {}
    throw error;
  }
}

function makeCopy() {
  return JSON.parse(JSON.stringify(data));
}

function saveChanges(copy) {
  persist(copy);
  data = copy;
}

// Реєстрація користувача
function saveUser(telegramId, name, role) {
  const copy = makeCopy();
  const existing = copy.users[telegramId];

  copy.users[telegramId] = {
    telegramId,
    name,
    role,
    createdAt: existing
      ? existing.createdAt
      : new Date().toISOString()
  };

  try {
    saveChanges(copy);
    return true;
  } catch (error) {
    console.error('saveUser:', error.message);
    return false;
  }
}

function getUser(telegramId) {
  return data.users[telegramId] || null;
}

function indexOfId(list, id) {
  return list.findIndex(item => item.id === id);
}

// CREATE — додавання витрати
function addExpense(userId, category, amount) {
  const copy = makeCopy();
  copy.lastExpenseId += 1;

  const record = {
    id: copy.lastExpenseId,
    userId,
    category,
    amount,
    createdAt: new Date().toISOString()
  };

  copy.expenses.push(record);
  saveChanges(copy);
  return record;
}

// Масовий імпорт CSV
function addManyExpenses(userId, items) {
  if (!Array.isArray(items)) {
    throw new Error('Очікується масив витрат');
  }

  if (items.length === 0) {
    return 0;
  }

  const copy = makeCopy();

  for (const item of items) {
    copy.lastExpenseId += 1;

    copy.expenses.push({
      id: copy.lastExpenseId,
      userId,
      category: item.category,
      amount: item.amount,
      createdAt: item.createdAt || new Date().toISOString()
    });
  }

  saveChanges(copy);
  return items.length;
}

// READ
function getExpense(id, userId) {
  return data.expenses.find(
    item => item.id === id && item.userId === userId
  ) || null;
}

function listExpenses(userId) {
  return data.expenses
    .filter(item => item.userId === userId)
    .slice(-10)
    .reverse();
}

// UPDATE
function updateExpense(id, userId, amount) {
  const copy = makeCopy();
  const index = indexOfId(copy.expenses, id);

  if (index === -1 || copy.expenses[index].userId !== userId) {
    return null;
  }

  copy.expenses[index].amount = amount;
  copy.expenses[index].updatedAt =
    new Date().toISOString();

  saveChanges(copy);
  return copy.expenses[index];
}

// DELETE
function deleteExpense(id, userId) {
  const copy = makeCopy();
  const index = indexOfId(copy.expenses, id);

  if (index === -1 || copy.expenses[index].userId !== userId) {
    return null;
  }

  const removed = copy.expenses[index];
  copy.expenses.splice(index, 1);
  saveChanges(copy);

  return removed;
}

// ЛАБА №12 — записи за останні N годин
function listExpensesLastHours(userId, hours) {
  const fromTime = Date.now() - hours * 60 * 60 * 1000;

  return data.expenses
    .filter(item =>
      item.userId === userId &&
      Number.isFinite(Date.parse(item.createdAt)) &&
      new Date(item.createdAt).getTime() >= fromTime &&
      new Date(item.createdAt).getTime() <= Date.now()
    )
    .reverse();
}

function listExpensesByDay(userId, dayText) {
  return data.expenses
    .filter(item =>
      item.userId === userId &&
      Number.isFinite(Date.parse(item.createdAt)) &&
      new Date(item.createdAt)
        .toLocaleDateString('uk-UA', {
          timeZone: 'Europe/Kyiv'
        }) === dayText
    )
    .reverse();
}


// ЛАБОРАТОРНА №14 — ПІДПИСКИ ТА НАГАДУВАННЯ

function loadData() {
  loadBaseData();
  if (!Array.isArray(data.subscribers)) data.subscribers = [];
  if (!Array.isArray(data.reminders)) data.reminders = [];
  if (!Number.isSafeInteger(data.lastReminderId)) {
    data.lastReminderId = 0;
  }
  if (typeof data.lastReportDay !== 'string') {
    data.lastReportDay = '';
  }
}

function isSubscribed(userId) {
  return data.subscribers.includes(userId);
}

function listSubscribers() {
  return data.subscribers.slice();
}

function addSubscriber(userId) {
  const copy = makeCopy();
  if (!copy.subscribers.includes(userId)) {
    copy.subscribers.push(userId);
  }
  saveChanges(copy);
}

function removeSubscriber(userId) {
  const copy = makeCopy();
  copy.subscribers = copy.subscribers.filter(id => id !== userId);
  saveChanges(copy);
}

function addReminder(userId, text, dueAt) {
  const copy = makeCopy();
  copy.lastReminderId += 1;

  const reminder = {
    id: copy.lastReminderId,
    userId,
    text,
    dueAt
  };

  copy.reminders.push(reminder);
  saveChanges(copy);
  return reminder;
}

function listDueReminders(nowMs) {
  return data.reminders.filter(
    r => Date.parse(r.dueAt) <= nowMs
  );
}

function listUserReminders(userId) {
  return data.reminders.filter(r => r.userId === userId);
}

function removeReminder(id) {
  const copy = makeCopy();
  copy.reminders = copy.reminders.filter(r => r.id !== id);
  saveChanges(copy);
}

function getLastReportDay() {
  return data.lastReportDay;
}

function setLastReportDay(dayText) {
  const copy = makeCopy();
  copy.lastReportDay = dayText;
  saveChanges(copy);
}


// ЛАБА 18 — збереження з урахуванням часу та дублікатів
function addDeviceExpense(category, amount, time) {
  const duplicate = data.expenses.some(item =>
    item.userId === 0 &&
    item.category === category &&
    item.createdAt === time
  );

  if (duplicate) {
    return null;
  }

  const copy = makeCopy();
  copy.lastExpenseId += 1;

  const record = {
    id: copy.lastExpenseId,
    userId: 0,
    category,
    amount,
    createdAt: time
  };

  // Вставка за хронологією
  let index = copy.expenses.length;

  while (
    index > 0 &&
    copy.expenses[index - 1].createdAt > time
  ) {
    index--;
  }

  copy.expenses.splice(index, 0, record);

  saveChanges(copy);
  return record;
}

module.exports = {
  addDeviceExpense,
  isSubscribed,
  listSubscribers,
  addSubscriber,
  removeSubscriber,
  addReminder,
  listDueReminders,
  listUserReminders,
  removeReminder,
  getLastReportDay,
  setLastReportDay,

  loadData,
  saveUser,
  getUser,
  addExpense,
  addManyExpenses,
  getExpense,
  listExpenses,
  updateExpense,
  deleteExpense,
  listExpensesLastHours,
  listExpensesByDay
};


//
// ЛАБОРАТОРНА №15 — ПІДПИСКИ ЗА ТЕМАМИ
//

const { TOPICS } = require('./config');

// Завантаження та перенесення старих підписок
const originalLoadData = module.exports.loadData;

function loadTopicsData() {
  originalLoadData();

  if (!data.subscriptions ||
      typeof data.subscriptions !== 'object') {
    data.subscriptions = {};
  }

  for (const topic of Object.keys(TOPICS)) {
    if (!Array.isArray(data.subscriptions[topic])) {
      data.subscriptions[topic] = [];
    }
  }

  // Старі підписники щоденного звіту
  if (Array.isArray(data.subscribers)) {
    for (const id of data.subscribers) {
      if (!data.subscriptions.report.includes(id)) {
        data.subscriptions.report.push(id);
      }
    }

    delete data.subscribers;
  }
}

function topicName(topic) {
  if (Object.hasOwn(TOPICS, topic)) {
    return topic;
  }

  throw new Error('Невідома тема підписки');
}

// Підтримуємо також старі виклики з лабораторної 14
function subscriptionArgs(topic, userId) {
  if (userId === undefined) {
    return ['report', topic];
  }

  return [topicName(topic), userId];
}

function topicIsSubscribed(topic, userId) {
  [topic, userId] = subscriptionArgs(topic, userId);
  return data.subscriptions[topic].includes(userId);
}

function topicListSubscribers(topic = 'report') {
  topicName(topic);
  return data.subscriptions[topic].slice();
}

function topicAddSubscriber(topic, userId) {
  [topic, userId] = subscriptionArgs(topic, userId);

  const copy = makeCopy();

  if (!copy.subscriptions[topic].includes(userId)) {
    copy.subscriptions[topic].push(userId);
    saveChanges(copy);
  }
}

function topicRemoveSubscriber(topic, userId) {
  [topic, userId] = subscriptionArgs(topic, userId);

  const copy = makeCopy();
  const index = copy.subscriptions[topic].indexOf(userId);

  if (index !== -1) {
    copy.subscriptions[topic].splice(index, 1);
    saveChanges(copy);
  }
}

// Замінюємо експорт старих функцій новими
module.exports.loadData = loadTopicsData;
module.exports.isSubscribed = topicIsSubscribed;
module.exports.listSubscribers = topicListSubscribers;
module.exports.addSubscriber = topicAddSubscriber;
module.exports.removeSubscriber = topicRemoveSubscriber;

