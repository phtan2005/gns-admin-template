const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('customer group pages reference existing local resources', () => {
  for (const page of [
    'customer-groups.html',
    'customer-group-form.html',
    'customer-group-details.html'
  ]) {
    const source = read(page);

    for (const match of source.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)) {
      const reference = match[1];
      if (/^(?:https?:|mailto:|tel:|javascript:)/.test(reference)) continue;

      assert.ok(
        fs.existsSync(path.join(root, reference)),
        `${page} references missing local resource: ${reference}`
      );
    }
  }
});

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

test('customer group form exposes add-customer modal contract', () => {
  const html = read('customer-group-form.html');
  for (const id of [
    'add-customer-button',
    'add-customer-modal',
    'add-customer-form',
    'new-customer-name',
    'new-customer-email',
    'new-customer-phone',
    'new-customer-status',
    'new-customer-avatar',
    'new-customer-avatar-preview',
    'save-new-customer'
  ]) assert.match(html, new RegExp(`id=["']${id}["']`));

  assert.match(html, /Tối đa 3 MB/);
});

test('editing a group persists a newly created customer as a member', () => {
  const source = read('assets/js/pages/customer-group-form.js');
  assert.match(source, /persistCustomerToEditedGroup\(customer\.id\)/);
});
test('customer group controllers keep the current view without automatic redirects', () => {
  for (const script of [
    'assets/js/pages/customer-group-form.js',
    'assets/js/pages/customer-group-details.js'
  ]) {
    assert.doesNotMatch(read(script), /window\.location\.replace/);
  }
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
