const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('shared app script defines the customer group menu', () => {
  const source = read('assets/js/app.js');
  assert.match(source, /customer-groups-menu-item/);
  assert.match(source, /customer-groups\.html/);
});
