
const currency = require('./currency');

const realFetch = globalThis.fetch;
let calls = 0;
let mode = 'ok';

function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

// Підміняємо справжній API тестовими відповідями
globalThis.fetch = async function (url) {
  calls++;

  if (mode === 'network') {
    throw new TypeError('fetch failed');
  }

  if (mode === 'error500') {
    return fakeResponse(500, {});
  }

  if (mode === 'badjson') {
    return {
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      }
    };
  }

  if (mode === 'badstructure') {
    return fakeResponse(200, { error: 'invalid data' });
  }

  const code = new URL(url).searchParams.get('valcode');

  if (code === 'ABC') {
    return fakeResponse(200, []);
  }

  return fakeResponse(200, [{
    cc: code,
    rate: 45.5,
    exchangedate: '17.11.2026'
  }]);
};

async function main() {
  try {
    // 1. Успішне отримання
    currency.clearCache();

    const rate = await currency.getRate('USD');
    console.log('1. Курс USD:', rate.rate);
    console.log('   Запитів:', calls);

    // 2. Повторний запит із кешу
    await currency.getRate('USD');
    console.log('2. Після кешу, запитів:', calls);

    // 3. Валюта не знайдена
    console.log(
      '3. Невідома валюта:',
      await currency.getRate('ABC')
    );

    // 4. HTTP 500
    mode = 'error500';
    currency.clearCache();

    try {
      await currency.getRate('USD');
    } catch (error) {
      console.log('4. HTTP-помилка:', error.message);
    }

    // 5. Відсутність мережі
    mode = 'network';
    currency.clearCache();

    try {
      await currency.getRate('USD');
    } catch (error) {
      console.log('5. Немає мережі:', error.message);
    }

    // 6. Некоректний JSON
    mode = 'badjson';
    currency.clearCache();

    try {
      await currency.getRate('USD');
    } catch (error) {
      console.log('6. Некоректний JSON:', error.name);
    }

    // 7. Неправильна структура відповіді
    mode = 'badstructure';
    currency.clearCache();

    try {
      await currency.getRate('USD');
    } catch (error) {
      console.log('7. Структура API:', error.message);
    }

    // 8. Конвертація
    mode = 'ok';
    currency.clearCache();

    const result = await currency.convertToUAH(100, 'USD');
    console.log(
      '8. Конвертація:',
      result.result.toFixed(2), 'грн'
    );

    console.log('✅ Усі сценарії виконано');
  } finally {
    globalThis.fetch = realFetch;
  }
}

main().catch(error => {
  globalThis.fetch = realFetch;
  console.error('Помилка тесту:', error);
  process.exitCode = 1;
});

