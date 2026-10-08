'use strict';

// One calendar date per generation, independent of the build machine's zone.
function createBuildDate(clock = () => new Date()) {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  let value;
  function refresh() {
    const parts = Object.fromEntries(formatter.formatToParts(clock()).map(part => [part.type, part.value]));
    value = `${parts.year}-${parts.month}-${parts.day}`;
  }
  refresh();
  return { read: () => value, refresh };
}

module.exports = { createBuildDate };
