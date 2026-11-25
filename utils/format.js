
const stats = require('./stats');

const NOT_FOUND_TEXT =
  '❌ Запису з таким номером немає.';

const SAVE_FAILED_TEXT =
  '❌ Не вдалося зберегти зміни. Спробуй пізніше.';

function formatExpense(record) {
  const when = new Date(record.createdAt)
    .toLocaleString('uk-UA', {
      timeZone: 'Europe/Kyiv'
    });

  return (
    `#${record.id} · ${record.category} · ` +
    `${record.amount.toFixed(2)} грн · ${when}`
  );
}

// Лабораторна №11 — звіт про імпорт CSV
function formatImportReport(addedCount, errors) {
  let text = `✅ Імпортовано записів: ${addedCount}`;

  if (errors.length > 0) {
    text += `\n⚠️ Пропущено рядків: ${errors.length}`;

    for (const error of errors.slice(0, 5)) {
      text += `\n• ${error}`;
    }

    if (errors.length > 5) {
      text += `\n… і ще ${errors.length - 5} помилок`;
    }
  }

  return text;
}

// Лабораторна №12 — скільки часу минуло
function formatAgo(iso) {
  const minutes = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(iso).getTime()) / 60000
    )
  );

  if (minutes < 1) return 'щойно';
  if (minutes < 60) return `${minutes} хв тому`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} год тому`;

  return `${Math.floor(hours / 24)} дн тому`;
}

// Лабораторна №12 — звіт за період
function formatPeriodReport(title, items) {
  if (items.length === 0) {
    return `${title}: записів немає.`;
  }

  let text = `${title}: ${items.length}`;

  for (const item of items.slice(0, 10)) {
    text +=
      `\n${formatExpense(item)}` +
      ` (${formatAgo(item.createdAt)})`;
  }

  if (items.length > 10) {
    text += `\n… і ще ${items.length - 10} записів`;
  }

  return text;
}

// Лабораторна №13 — статистика за категоріями
function formatStatsReport(title, records) {
  if (records.length === 0) {
    return `${title}: записів немає.`;
  }

  const groups = stats.groupByCategory(records);
  const names = Object.keys(groups);

  let text = `📊 ${title}: ${records.length} записів`;

  const limit = Math.min(names.length, 10);

  for (let i = 0; i < limit; i++) {
    const name = names[i];
    const result = stats.calcStats(groups[name]);

    text +=
      `\n\n${name}: ${result.count} шт.` +
      `\nМінімум: ${result.min.toFixed(2)} грн` +
      `\nМаксимум: ${result.max.toFixed(2)} грн` +
      `\nСереднє: ${result.avg.toFixed(2)} грн`;
  }

  if (names.length > 10) {
    text += `\n… і ще ${names.length - 10} категорій`;
  }

  return text;
}

module.exports = {
  NOT_FOUND_TEXT,
  SAVE_FAILED_TEXT,
  formatExpense,
  formatImportReport,
  formatAgo,
  formatPeriodReport,
  formatStatsReport
};

