
const png = require('./png');

const BLOCKS = '▁▂▃▄▅▆▇█';

const WHITE = [255, 255, 255];
const GRAY = [225, 225, 225];
const DARK = [50, 60, 70];
const BLUE = [28, 114, 147];
const GREEN = [46, 160, 90];
const RED = [200, 60, 60];
const AMBER = [242, 166, 90];

// Текстова діаграма
function sparkline(values) {
  if (values.length === 0) return '';

  let min = values[0];
  let max = values[0];

  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  let text = '';

  for (const value of values) {
    const level = max > min
      ? Math.round((value - min) / (max - min) * 7)
      : 3;

    text += BLOCKS[level];
  }

  return text;
}

// Зменшення кількості точок
function downsample(points, maxPoints) {
  if (points.length <= maxPoints) {
    return points.slice();
  }

  const size = Math.ceil(points.length / maxPoints);
  const result = [];

  for (let start = 0; start < points.length; start += size) {
    let sumTime = 0;
    let sumValue = 0;
    let count = 0;

    for (
      let i = start;
      i < start + size && i < points.length;
      i++
    ) {
      sumTime += points[i].time;
      sumValue += points[i].value;
      count++;
    }

    result.push({
      time: sumTime / count,
      value: sumValue / count
    });
  }

  return result;
}

// Межі графіка
function makeView(points, plot) {
  let tMin = points[0].time;
  let tMax = points[0].time;
  let vMin = points[0].value;
  let vMax = points[0].value;

  for (const point of points) {
    if (point.time < tMin) tMin = point.time;
    if (point.time > tMax) tMax = point.time;
    if (point.value < vMin) vMin = point.value;
    if (point.value > vMax) vMax = point.value;
  }

  let padding = (vMax - vMin) * 0.05;

  if (padding === 0) padding = 1;

  return {
    tMin,
    tMax,
    vMin: vMin - padding,
    vMax: vMax + padding,
    ...plot
  };
}

// Перетворення часу в координату X
function toX(view, time) {
  if (view.tMax === view.tMin) {
    return view.left;
  }

  return Math.round(
    view.left +
    (time - view.tMin) /
    (view.tMax - view.tMin) * view.width
  );
}

// Перетворення значення в координату Y
function toY(view, value) {
  return Math.round(
    view.top + view.height -
    (value - view.vMin) /
    (view.vMax - view.vMin) * view.height
  );
}

// Час для підписів осі X
function clock(time) {
  return new Date(time).toLocaleTimeString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
}

// Малювання графіка
function buildLineChart(points, limits) {
  if (points.length < 2) {
    throw new Error('Потрібно щонайменше 2 точки');
  }

  const width = 640;
  const height = 360;

  const canvas = png.createCanvas(width, height, WHITE);

  const view = makeView(points, {
    left: 70,
    top: 20,
    width: 550,
    height: 295
  });

  const right = view.left + view.width;
  const bottom = view.top + view.height;

  // Сітка та підписи значень
  for (let i = 0; i <= 4; i++) {
    const value =
      view.vMin + (view.vMax - view.vMin) * i / 4;

    const y = toY(view, value);

    png.drawLine(
      canvas, view.left, y, right, y, GRAY, 1
    );

    const label = value.toFixed(1);

    png.drawText(
      canvas,
      label,
      view.left - 8 - png.textWidth(label, 2),
      y - 5,
      DARK, 2
    );
  }

  // Межі допустимих значень
  for (const limit of [limits.min, limits.max]) {
    if (limit > view.vMin && limit < view.vMax) {
      const y = toY(view, limit);

      for (let x = view.left; x < right; x += 14) {
        png.drawLine(
          canvas, x, y,
          Math.min(x + 7, right), y,
          AMBER, 2
        );
      }
    }
  }

  // Осі
  png.drawLine(
    canvas, view.left, view.top,
    view.left, bottom, DARK, 2
  );

  png.drawLine(
    canvas, view.left, bottom,
    right, bottom, DARK, 2
  );

  // Підписи часу
  const times = [
    [view.tMin, view.left],
    [(view.tMin + view.tMax) / 2, view.left + view.width / 2],
    [view.tMax, right]
  ];

  for (let i = 0; i < times.length; i++) {
    const label = clock(times[i][0]);
    let x = times[i][1];

    if (i === 1) {
      x -= png.textWidth(label, 2) / 2;
    }

    if (i === 2) {
      x -= png.textWidth(label, 2);
    }

    png.drawText(
      canvas, label, Math.round(x),
      bottom + 12, DARK, 2
    );
  }

  // Лінія графіка
  for (let i = 1; i < points.length; i++) {
    png.drawLine(
      canvas,
      toX(view, points[i - 1].time),
      toY(view, points[i - 1].value),
      toX(view, points[i].time),
      toY(view, points[i].value),
      BLUE, 2
    );
  }

  // Маркери точок
  if (points.length <= 60) {
    for (const point of points) {
      png.fillRect(
        canvas,
        toX(view, point.time) - 2,
        toY(view, point.value) - 2,
        5, 5, BLUE
      );
    }
  }

  // Мінімум і максимум
  let minPoint = points[0];
  let maxPoint = points[0];

  for (const point of points) {
    if (point.value < minPoint.value) {
      minPoint = point;
    }

    if (point.value > maxPoint.value) {
      maxPoint = point;
    }
  }

  png.fillRect(
    canvas,
    toX(view, minPoint.time) - 4,
    toY(view, minPoint.value) - 4,
    9, 9, GREEN
  );

  png.fillRect(
    canvas,
    toX(view, maxPoint.time) - 4,
    toY(view, maxPoint.value) - 4,
    9, 9, RED
  );

  return canvas;
}

function chartToPng(points, limits) {
  return png.encodePng(
    buildLineChart(points, limits)
  );
}

module.exports = {
  sparkline,
  downsample,
  makeView,
  toX,
  toY,
  buildLineChart,
  chartToPng
};

