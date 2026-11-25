
function parseNumber(input) {
  if (
    typeof input !== 'string' ||
    !/^\d{1,9}(?:[.,]\d{1,2})?$/.test(input.trim())
  ) {
    return null;
  }

  const value = Number(input.trim().replace(',', '.'));

  return Number.isFinite(value) && value > 0
    ? value
    : null;
}

function parseId(input) {
  if (
    typeof input !== 'string' ||
    !/^[1-9]\d*$/.test(input.trim())
  ) {
    return null;
  }

  const id = Number(input.trim());

  return Number.isSafeInteger(id) ? id : null;
}

function isNonEmpty(text) {
  return (
    typeof text === 'string' &&
    text.trim().length > 0 &&
    text.trim().length <= 60 &&
    /[\p{L}\p{N}]/u.test(text)
  );
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Помилка JSON:', error.message);
    return null;
  }
}

// Лаба 12 — години (за замовчуванням 24)
function parseHours(text) {
  if (text === undefined) return 24;

  const hours = parseNumber(text);

  if (hours === null || hours > 720) {
    return null;
  }

  return hours;
}

// Лаба 12 — перевірка календарної дати
function isValidDate(text) {
  if (
    typeof text !== 'string' ||
    !/^\d{2}\.\d{2}\.\d{4}$/.test(text)
  ) {
    return false;
  }

  const [day, month, year] = text.split('.').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Лаба 13 — кількість записів для /top
function parseCount(text) {
  if (text === undefined) return 5;

  const count = parseId(text);

  if (count === null || count > 20) {
    return null;
  }

  return count;
}

module.exports = {
  parseNumber,
  parseId,
  isNonEmpty,
  parseJson,
  parseHours,
  isValidDate,
  parseCount
};

