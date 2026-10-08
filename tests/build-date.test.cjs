'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('build date uses Shanghai calendar days across UTC midnight and year boundaries', () => {
  const { createBuildDate } = require('../lib/build-date.cjs');
  for (const [instant, expected] of [
    ['2026-10-07T15:59:59Z', '2026-10-07'],
    ['2026-10-07T16:00:00Z', '2026-10-08'],
    ['2026-12-31T16:00:00Z', '2027-01-01']
  ]) {
    const date = createBuildDate(() => new Date(instant));
    assert.equal(date.read(), expected);
  }
});

test('date stays fixed within a build and refreshes on the next generation', () => {
  const { createBuildDate } = require('../lib/build-date.cjs');
  let instant = '2026-10-07T15:59:59Z';
  const date = createBuildDate(() => new Date(instant));
  assert.equal(date.read(), '2026-10-07');
  instant = '2026-10-07T16:00:00Z';
  assert.equal(date.read(), '2026-10-07');
  date.refresh();
  assert.equal(date.read(), '2026-10-08');
});
