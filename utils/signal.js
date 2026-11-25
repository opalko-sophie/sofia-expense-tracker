
const SENSORS = [
  {
    name: 'Продукти',
    base: 250,
    amplitude: 70,
    noise: 15
  },
  {
    name: 'Кафе',
    base: 180,
    amplitude: 50,
    noise: 10
  }
];

const PERIOD = 60;
const ANOMALY_CHANCE = 0.03;
const ANOMALY_SIZE = 450;

// Генератор псевдовипадкових чисел
function makeRandom(seed) {
  let state = seed >>> 0;

  return function () {
    state = (
      state * 1664525 + 1013904223
    ) >>> 0;

    return state / 4294967296;
  };
}

// Генерація суми витрати
function generateValue(sensor, step, random) {
  const wave =
    sensor.amplitude *
    Math.sin(step / PERIOD * 2 * Math.PI);

  const noise =
    (random() - 0.5) * 2 * sensor.noise;

  let value = sensor.base + wave + noise;

  // Іноді виникає аномальна витрата
  if (random() < ANOMALY_CHANCE) {
    const direction = random() < 0.5 ? -1 : 1;

    value += direction * ANOMALY_SIZE;
  }

  // Витрата не може бути від'ємною
  value = Math.max(0.1, value);

  return Math.round(value * 10) / 10;
}

module.exports = {
  SENSORS,
  PERIOD,
  ANOMALY_CHANCE,
  ANOMALY_SIZE,
  makeRandom,
  generateValue
};

