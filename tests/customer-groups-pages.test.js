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

test('customer-groups.html exposes the list page contract', () => {
  const source = read('customer-groups.html');

  for (const asset of [
    'assets/css/bootstrap.min.css',
    'assets/css/icons.min.css',
    'assets/css/app.min.css',
    'assets/css/custom.css'
  ]) assert.match(source, new RegExp(asset.replaceAll('.', '\\.')));

  for (const id of [
    'navbar-nav',
    'topnav-hamburger-icon',
    'group-search',
    'status-filter',
    'groups-table-body',
    'groups-empty',
    'groups-pagination'
  ]) assert.match(source, new RegExp(`id=["']${id}["']`));

  assert.match(source, /class=["'][^"']*main-content[^"']*["']/);
  assert.match(source, /class=["'][^"']*page-content[^"']*["']/);
  assert.match(source, /href=["']customer-group-form\.html["']/);

  const bootstrap = source.indexOf('assets/libs/bootstrap/js/bootstrap.bundle.min.js');
  const store = source.indexOf('assets/js/pages/customer-groups-store.js');
  const list = source.indexOf('assets/js/pages/customer-groups-list.js');
  const app = source.indexOf('assets/js/app.js');
  assert.ok(bootstrap >= 0 && bootstrap < store && store < list && list < app);
});

test('customer-group-form.html exposes the create and edit form contract', () => {
  const source = read('customer-group-form.html');

  for (const asset of [
    'assets/css/bootstrap.min.css',
    'assets/css/icons.min.css',
    'assets/css/app.min.css',
    'assets/css/custom.css'
  ]) assert.match(source, new RegExp(asset.replaceAll('.', '\\.')));

  for (const id of [
    'navbar-nav',
    'topnav-hamburger-icon',
    'customer-group-form',
    'form-title',
    'group-name',
    'group-description',
    'group-status',
    'customer-search',
    'customer-picker-list',
    'selected-count',
    'save-group-button'
  ]) assert.match(source, new RegExp(`id=["']${id}["']`));

  assert.match(source, /class=["'][^"']*main-content[^"']*["']/);
  assert.match(source, /class=["'][^"']*page-content[^"']*["']/);
  assert.match(source, /href=["']customer-groups\.html["']/);

  const bootstrap = source.indexOf('assets/libs/bootstrap/js/bootstrap.bundle.min.js');
  const store = source.indexOf('assets/js/pages/customer-groups-store.js');
  const form = source.indexOf('assets/js/pages/customer-group-form.js');
  const app = source.indexOf('assets/js/app.js');
  assert.ok(bootstrap >= 0 && bootstrap < store && store < form && form < app);
});

test('customer-group-details.html exposes the detail and member management contract', () => {
  const source = read('customer-group-details.html');

  for (const asset of [
    'assets/css/bootstrap.min.css',
    'assets/css/icons.min.css',
    'assets/css/app.min.css',
    'assets/css/custom.css',
    'assets/libs/sweetalert2/sweetalert2.min.css'
  ]) assert.match(source, new RegExp(asset.replaceAll('.', '\\.')));

  for (const id of [
    'navbar-nav',
    'topnav-hamburger-icon',
    'group-title',
    'group-description-text',
    'group-status-badge',
    'member-count',
    'member-search',
    'members-table-body',
    'members-empty',
    'edit-group-link'
  ]) assert.match(source, new RegExp(`id=["']${id}["']`));

  assert.match(source, /class=["'][^"']*main-content[^"']*["']/);
  assert.match(source, /class=["'][^"']*page-content[^"']*["']/);
  assert.match(source, /href=["']customer-groups[.]html["']/);

  const bootstrap = source.indexOf('assets/libs/bootstrap/js/bootstrap.bundle.min.js');
  const swal = source.indexOf('assets/libs/sweetalert2/sweetalert2.min.js');
  const store = source.indexOf('assets/js/pages/customer-groups-store.js');
  const details = source.indexOf('assets/js/pages/customer-group-details.js');
  const app = source.indexOf('assets/js/app.js');
  assert.ok(bootstrap >= 0 && bootstrap < swal && swal < store && store < details && details < app);
});
