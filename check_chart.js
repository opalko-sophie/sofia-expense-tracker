
const fs = require('fs');
const path = require('path');
const signal = require('./utils/signal');
const chart = require('./utils/chart');

const sensor = signal.SENSORS[0];
const random = signal.makeRandom(42);

const start = Date.parse('2026-11-05T08:00:00.000Z');
const points = [];

// Створюємо 72 тестові точки
for (let step = 0; step < 72; step++) {
  points.push({
    time: start + step * 5 * 60 * 1000,
    value: signal.generateValue(sensor, step, random)
  });
}

// Генеруємо PNG
const image = chart.chartToPng(points, {
  min: 10,
  max: 500
});

const file = path.join(__dirname, 'chart_check.png');

fs.writeFileSync(file, image);

// Перевіряємо підпис PNG
const signatureHex = [];

for (let i = 0; i < 8; i++) {
  signatureHex.push(
    image[i].toString(16).padStart(2, '0')
  );
}

console.log('✅ Точок на графіку:', points.length);
console.log('Підпис PNG:', signatureHex.join(' '));

console.log(
  'Розмір зображення:',
  image.readUInt32BE(16) + '×' +
  image.readUInt32BE(20)
);

console.log('Файл записано:', file);

console.log(
  'Міні-діаграма:',
  chart.sparkline(
    chart.downsample(points, 30).map(p => p.value)
  )
);

