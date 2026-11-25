
function calcStats(records) {
  if (records.length === 0) return null;

  let sum = 0;
  let min = records[0].amount;
  let max = records[0].amount;

  for (const record of records) {
    sum += record.amount;

    if (record.amount < min) min = record.amount;
    if (record.amount > max) max = record.amount;
  }

  return {
    count: records.length,
    min,
    max,
    avg: sum / records.length
  };
}

function groupByCategory(records) {
  const groups = Object.create(null);

  for (const record of records) {
    if (!groups[record.category]) {
      groups[record.category] = [];
    }

    groups[record.category].push(record);
  }

  return groups;
}

function topValues(records, count) {
  const rest = records.slice();
  const result = [];

  while (result.length < count && rest.length > 0) {
    let maxIndex = 0;

    for (let i = 1; i < rest.length; i++) {
      if (rest[i].amount > rest[maxIndex].amount) {
        maxIndex = i;
      }
    }

    result.push(rest[maxIndex]);
    rest.splice(maxIndex, 1);
  }

  return result;
}

module.exports = {
  calcStats,
  groupByCategory,
  topValues
};

