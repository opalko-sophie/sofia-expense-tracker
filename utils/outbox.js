
function addToQueue(queue, reading, maxSize) {
  queue.push(reading);

  let dropped = 0;

  while (queue.length > maxSize) {
    queue.shift();
    dropped++;
  }

  return dropped;
}

// Чи є помилка постійною?
function isPermanent(error) {
  return (
    Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 401
  );
}

// Повторна відправка повідомлень
async function flushQueue(queue, send) {
  const result = {
    sent: 0,
    dropped: 0,
    left: 0,
    error: null
  };

  while (queue.length > 0) {
    try {
      await send(queue[0]);

      queue.shift();
      result.sent++;

    } catch (error) {
      if (isPermanent(error)) {
        queue.shift();
        result.dropped++;
      } else {
        result.error = error.message;
        break;
      }
    }
  }

  result.left = queue.length;

  return result;
}

module.exports = {
  addToQueue,
  isPermanent,
  flushQueue
};

