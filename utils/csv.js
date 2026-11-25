
const fs = require('fs');
const { parseNumber, isNonEmpty } = require('./validators');

// Читання CSV-файлу
function readCsvFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

// Розділення рядка на стовпці
function splitLine(line, separator) {
  return line.split(separator).map(cell => cell.trim());
}

// Розбір CSV
function parseCsv(text) {
  if (typeof text !== 'string') {
    throw new Error('CSV має бути текстовим файлом');
  }

  // Видаляємо BOM, якщо він є
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const lines = text.split('\n');
  const firstLine = lines.find(line => line.trim());

  if (!firstLine) {
    return [];
  }

  // Підтримка коми та крапки з комою
  const separator = firstLine.includes(';') ? ';' : ',';
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      continue;
    }

    rows.push({
      lineNumber: i + 1,
      cells: splitLine(line, separator)
    });
  }

  return rows;
}

// Перевірка даних витрат
function expensesFromCsv(text) {
  const rows = parseCsv(text);
  const good = [];
  const errors = [];

  if (rows.length === 0) {
    return {
      good,
      errors: ['CSV-файл порожній']
    };
  }

  // Перевірка заголовків
  const headers = rows[0].cells.map(
    cell => cell.toLowerCase()
  );

  if (
    headers.length !== 2 ||
    headers[0] !== 'category' ||
    headers[1] !== 'amount'
  ) {
    return {
      good,
      errors: [
        'Рядок 1: потрібні заголовки category,amount'
      ]
    };
  }

  // Перший рядок — заголовки, тому починаємо з 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (row.cells.length !== 2) {
      errors.push(
        `Рядок ${row.lineNumber}: має бути два стовпці`
      );
      continue;
    }

    const category = row.cells[0];
    const amount = parseNumber(row.cells[1]);

    if (!isNonEmpty(category)) {
      errors.push(
        `Рядок ${row.lineNumber}: некоректна категорія`
      );
      continue;
    }

    if (amount === null) {
      errors.push(
        `Рядок ${row.lineNumber}: некоректна сума "${row.cells[1]}"`
      );
      continue;
    }

    good.push({
      category,
      amount
    });
  }

  return { good, errors };
}

module.exports = {
  readCsvFile,
  parseCsv,
  expensesFromCsv
};

