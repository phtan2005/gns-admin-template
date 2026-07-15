# US02 Customer Group Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng mô-đun frontend quản lý nhóm khách hàng gồm danh sách, tạo/sửa, xem thành viên và gỡ khách hàng khỏi nhóm, với dữ liệu tồn tại trong `localStorage`.

**Architecture:** Tách lớp dữ liệu thuần JavaScript khỏi các controller DOM để kiểm thử bằng Node không cần dependency ngoài. Ba trang HTML dùng Bootstrap và asset sẵn có; `assets/js/app.js` chèn mục sidebar dùng chung trên toàn template. Mỗi trang chỉ đọc URL/input, gọi `CustomerGroupsStore` và render trạng thái hiện tại.

**Tech Stack:** HTML5, Bootstrap 5 hiện có, vanilla JavaScript UMD, `localStorage`, SweetAlert2 có sẵn, Node.js built-in test runner (`node:test`).

## Global Constraints

- Không thêm backend, API, package manager hoặc dependency mới.
- Toàn bộ nhãn, nút và thông báo của mô-đun dùng tiếng Việt.
- Lưu khách hàng ở `gns_customers_v1` và nhóm ở `gns_customer_groups_v1`.
- Một khách hàng có thể thuộc nhiều nhóm; gỡ thành viên không xoá khách hàng chung.
- Tên nhóm bắt buộc và duy nhất sau khi trim, không phân biệt hoa/thường.
- Trạng thái nhóm chỉ là `active` hoặc `inactive`.
- Giao diện phải responsive và theo style của template hiện có.
- Ưu tiên SweetAlert2; dùng `alert`/`confirm` khi thư viện không khả dụng.

---

## File Map

- Create `assets/js/pages/customer-groups-store.js`: seed khách hàng, đọc/ghi an toàn, validate và CRUD nhóm.
- Create `tests/customer-groups-store.test.js`: kiểm thử tự động toàn bộ quy tắc dữ liệu.
- Create `assets/js/app.js`: chèn menu sidebar và xử lý trạng thái active/mobile toggle tối thiểu.
- Create `tests/customer-groups-pages.test.js`: smoke test cấu trúc ba trang và menu dùng chung.
- Create `customer-groups.html`: màn hình tìm kiếm, lọc, phân trang danh sách nhóm.
- Create `assets/js/pages/customer-groups-list.js`: controller trang danh sách.
- Create `customer-group-form.html`: form tạo/sửa và chọn nhiều khách hàng.
- Create `assets/js/pages/customer-group-form.js`: controller form, validation và lưu.
- Create `customer-group-details.html`: thông tin nhóm và bảng thành viên.
- Create `assets/js/pages/customer-group-details.js`: controller chi tiết và gỡ thành viên.
- Modify `assets/css/custom.css`: style nhỏ chỉ dành cho picker, empty state và responsive table.

---

### Task 1: Customer group storage service

**Files:**
- Create: `assets/js/pages/customer-groups-store.js`
- Create: `tests/customer-groups-store.test.js`

**Interfaces:**
- Consumes: Web Storage-compatible object with `getItem(key)`, `setItem(key, value)`, `removeItem(key)`.
- Produces: global/CommonJS `CustomerGroupsStore` with `KEYS`, `DEFAULT_CUSTOMERS`, and `createStore(storage, options)`.
- `createStore` returns `getCustomers()`, `getGroups()`, `getGroup(id)`, `createGroup(input)`, `updateGroup(id, input)`, and `removeCustomer(groupId, customerId)`.
- Group input is `{ name: string, description?: string, status: "active"|"inactive", customerIds?: string[] }`.

- [ ] **Step 1: Write the failing storage tests**

Create a memory storage helper and tests for seed-once, create, duplicate validation, update, multi-group membership, member removal, missing IDs and corrupt JSON:

```js
// tests/customer-groups-store.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, KEYS, DEFAULT_CUSTOMERS } = require('../assets/js/pages/customer-groups-store.js');

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    dump: () => Object.fromEntries(data)
  };
}

function setup(initial) {
  const storage = memoryStorage(initial);
  const store = createStore(storage, {
    now: () => '2026-07-15T08:00:00.000Z',
    makeId: () => 'group-test'
  });
  return { storage, store };
}

test('seeds customers only when the customer key is absent', () => {
  const { storage, store } = setup();
  assert.equal(store.getCustomers().length, DEFAULT_CUSTOMERS.length);
  const seeded = storage.getItem(KEYS.customers);
  store.getCustomers();
  assert.equal(storage.getItem(KEYS.customers), seeded);
});

test('creates and reloads a normalized group', () => {
  const { store } = setup();
  const created = store.createGroup({
    name: '  Khách hàng VIP  ', description: ' Ưu tiên ', status: 'active',
    customerIds: ['customer-1', 'customer-1', 'customer-2']
  });
  assert.deepEqual(created, {
    id: 'group-test', name: 'Khách hàng VIP', description: 'Ưu tiên', status: 'active',
    customerIds: ['customer-1', 'customer-2'],
    createdAt: '2026-07-15T08:00:00.000Z', updatedAt: '2026-07-15T08:00:00.000Z'
  });
  assert.deepEqual(store.getGroup('group-test'), created);
});

test('rejects blank and case-insensitive duplicate names', () => {
  const { store } = setup();
  assert.throws(() => store.createGroup({ name: ' ', status: 'active' }), /Tên nhóm là bắt buộc/);
  store.createGroup({ name: 'Khách hàng VIP', status: 'active' });
  assert.throws(
    () => store.createGroup({ name: '  KHÁCH HÀNG VIP ', status: 'inactive' }),
    /Tên nhóm đã tồn tại/
  );
});

test('updates a group while preserving createdAt', () => {
  const { store } = setup();
  store.createGroup({ name: 'VIP', status: 'active', customerIds: ['customer-1'] });
  const updated = store.updateGroup('group-test', {
    name: 'VIP mới', description: 'Đã sửa', status: 'inactive', customerIds: ['customer-2']
  });
  assert.equal(updated.createdAt, '2026-07-15T08:00:00.000Z');
  assert.equal(updated.name, 'VIP mới');
  assert.deepEqual(updated.customerIds, ['customer-2']);
});

test('a customer can belong to multiple groups and removal affects one group only', () => {
  let sequence = 0;
  const storage = memoryStorage();
  const store = createStore(storage, {
    now: () => '2026-07-15T08:00:00.000Z', makeId: () => `group-${++sequence}`
  });
  store.createGroup({ name: 'A', status: 'active', customerIds: ['customer-1'] });
  store.createGroup({ name: 'B', status: 'active', customerIds: ['customer-1'] });
  store.removeCustomer('group-1', 'customer-1');
  assert.deepEqual(store.getGroup('group-1').customerIds, []);
  assert.deepEqual(store.getGroup('group-2').customerIds, ['customer-1']);
  assert.ok(store.getCustomers().some(({ id }) => id === 'customer-1'));
});

test('reports missing groups and recovers from corrupt arrays', () => {
  const { store } = setup({
    [KEYS.groups]: '{bad json',
    [KEYS.customers]: JSON.stringify({ not: 'an array' })
  });
  assert.deepEqual(store.getGroups(), []);
  assert.deepEqual(store.getCustomers(), []);
  assert.throws(() => store.updateGroup('missing', { name: 'A', status: 'active' }), /Không tìm thấy nhóm/);
  assert.throws(() => store.removeCustomer('missing', 'customer-1'), /Không tìm thấy nhóm/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/customer-groups-store.test.js`

Expected: FAIL with `MODULE_NOT_FOUND` for `customer-groups-store.js`.

- [ ] **Step 3: Implement the storage service**

Use a UMD wrapper so the same implementation works in Node and browsers. Implement these exact behaviors:

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CustomerGroupsStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KEYS = { customers: 'gns_customers_v1', groups: 'gns_customer_groups_v1' };
  const DEFAULT_CUSTOMERS = [
    { id: 'customer-1', name: 'Nguyễn Văn An', email: 'an.nguyen@example.com', phone: '0901 234 567', status: 'active', avatar: 'assets/images/users/32/avatar-2.jpg' },
    { id: 'customer-2', name: 'Trần Thị Bình', email: 'binh.tran@example.com', phone: '0902 345 678', status: 'active', avatar: 'assets/images/users/32/avatar-3.jpg' },
    { id: 'customer-3', name: 'Lê Minh Châu', email: 'chau.le@example.com', phone: '0903 456 789', status: 'inactive', avatar: 'assets/images/users/32/avatar-4.jpg' },
    { id: 'customer-4', name: 'Phạm Quốc Dũng', email: 'dung.pham@example.com', phone: '0904 567 890', status: 'active', avatar: 'assets/images/users/32/avatar-5.jpg' },
    { id: 'customer-5', name: 'Hoàng Thu Hà', email: 'ha.hoang@example.com', phone: '0905 678 901', status: 'active', avatar: 'assets/images/users/32/avatar-6.jpg' },
    { id: 'customer-6', name: 'Vũ Gia Huy', email: 'huy.vu@example.com', phone: '0906 789 012', status: 'inactive', avatar: 'assets/images/users/32/avatar-7.jpg' },
    { id: 'customer-7', name: 'Đỗ Ngọc Lan', email: 'lan.do@example.com', phone: '0907 890 123', status: 'active', avatar: 'assets/images/users/32/avatar-8.jpg' },
    { id: 'customer-8', name: 'Bùi Đức Long', email: 'long.bui@example.com', phone: '0908 901 234', status: 'active', avatar: 'assets/images/users/32/avatar-9.jpg' }
  ];

  function createStore(storage, options = {}) {
    const now = options.now || (() => new Date().toISOString());
    const makeId = options.makeId || (() => `group-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const readArray = (key) => {
      try { const value = JSON.parse(storage.getItem(key)); return Array.isArray(value) ? value : []; }
      catch (_) { return []; }
    };
    const write = (key, value) => storage.setItem(key, JSON.stringify(value));
    const getGroups = () => readArray(KEYS.groups);
    const getGroup = (id) => getGroups().find((group) => group.id === id) || null;
    const getCustomers = () => {
      if (storage.getItem(KEYS.customers) === null) write(KEYS.customers, DEFAULT_CUSTOMERS);
      return readArray(KEYS.customers);
    };
    const normalize = (input, ignoredId) => {
      const name = String(input.name || '').trim();
      if (!name) throw new Error('Tên nhóm là bắt buộc.');
      if (!['active', 'inactive'].includes(input.status)) throw new Error('Trạng thái nhóm không hợp lệ.');
      if (getGroups().some((g) => g.id !== ignoredId && g.name.trim().toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'))) {
        throw new Error('Tên nhóm đã tồn tại.');
      }
      return { name, description: String(input.description || '').trim(), status: input.status, customerIds: [...new Set(input.customerIds || [])] };
    };
    const createGroup = (input) => {
      const groups = getGroups();
      const stamp = now();
      const group = { id: makeId(), ...normalize(input), createdAt: stamp, updatedAt: stamp };
      write(KEYS.groups, [...groups, group]);
      return group;
    };
    const updateGroup = (id, input) => {
      const groups = getGroups();
      const index = groups.findIndex((group) => group.id === id);
      if (index < 0) throw new Error('Không tìm thấy nhóm khách hàng.');
      groups[index] = { ...groups[index], ...normalize(input, id), updatedAt: now() };
      write(KEYS.groups, groups);
      return groups[index];
    };
    const removeCustomer = (groupId, customerId) => {
      const group = getGroup(groupId);
      if (!group) throw new Error('Không tìm thấy nhóm khách hàng.');
      return updateGroup(groupId, { ...group, customerIds: group.customerIds.filter((id) => id !== customerId) });
    };
    return { getCustomers, getGroups, getGroup, createGroup, updateGroup, removeCustomer };
  }

  return { KEYS, DEFAULT_CUSTOMERS, createStore };
});
```

- [ ] **Step 4: Run storage tests to verify they pass**

Run: `node --test tests/customer-groups-store.test.js`

Expected: 6 tests pass, 0 fail.

- [ ] **Step 5: Commit the storage service**

```bash
git add assets/js/pages/customer-groups-store.js tests/customer-groups-store.test.js
git commit -m "feat: add customer group storage service"
```

---

### Task 2: Shared sidebar and HTML page contracts

**Files:**
- Create: `assets/js/app.js`
- Create: `tests/customer-groups-pages.test.js`

**Interfaces:**
- Consumes: existing `#navbar-nav` element on template pages and `window.location.pathname`.
- Produces: one `#customer-groups-menu-item` link to `customer-groups.html`, active on all three module pages.
- Page contract IDs: list uses `groups-table-body`; form uses `customer-group-form`; details uses `members-table-body`.

- [ ] **Step 1: Write failing page contract tests**

```js
// tests/customer-groups-pages.test.js
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

for (const [file, requiredIds, pageScript] of [
  ['customer-groups.html', ['navbar-nav', 'groups-table-body', 'group-search', 'status-filter', 'groups-pagination'], 'customer-groups-list.js'],
  ['customer-group-form.html', ['navbar-nav', 'customer-group-form', 'group-name', 'group-description', 'group-status', 'customer-picker-list'], 'customer-group-form.js'],
  ['customer-group-details.html', ['navbar-nav', 'members-table-body', 'member-search', 'group-title'], 'customer-group-details.js']
]) {
  test(`${file} exposes its DOM contract`, () => {
    const html = read(file);
    for (const id of requiredIds) assert.match(html, new RegExp(`id=["']${id}["']`));
    assert.match(html, /customer-groups-store\.js/);
    assert.match(html, new RegExp(pageScript.replace('.', '\\.')));
    assert.match(html, /assets\/js\/app\.js/);
  });
}
```

- [ ] **Step 2: Run the contract tests to verify they fail**

Run: `node --test tests/customer-groups-pages.test.js`

Expected: FAIL because `assets/js/app.js` and the three pages do not exist.

- [ ] **Step 3: Implement shared sidebar injection**

Create `assets/js/app.js` with an idempotent menu insert and active-state logic:

```js
(function () {
  'use strict';
  function mountCustomerGroupsMenu() {
    const nav = document.getElementById('navbar-nav');
    if (!nav || document.getElementById('customer-groups-menu-item')) return;
    const page = window.location.pathname.split('/').pop() || '';
    const modulePages = ['customer-groups.html', 'customer-group-form.html', 'customer-group-details.html'];
    const active = modulePages.includes(page);
    const item = document.createElement('li');
    item.id = 'customer-groups-menu-item';
    item.className = 'nav-item';
    item.innerHTML = `<a class="nav-link menu-link${active ? ' active' : ''}" href="customer-groups.html"${active ? ' aria-current="page"' : ''}><i class="ph-users-three"></i><span>Quản lý nhóm khách hàng</span></a>`;
    const title = nav.querySelector('.menu-title');
    if (title && title.nextSibling) nav.insertBefore(item, title.nextSibling);
    else nav.appendChild(item);
  }
  function bindMobileSidebar() {
    const button = document.getElementById('topnav-hamburger-icon');
    if (button) button.addEventListener('click', () => document.body.classList.toggle('vertical-sidebar-enable'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { mountCustomerGroupsMenu(); bindMobileSidebar(); });
  else { mountCustomerGroupsMenu(); bindMobileSidebar(); }
})();
```

- [ ] **Step 4: Run only the shared script contract test**

Run: `node --test --test-name-pattern="shared app script" tests/customer-groups-pages.test.js`

Expected: 1 pass; page tests still fail until Tasks 3–5.

- [ ] **Step 5: Commit the shared sidebar**

```bash
git add assets/js/app.js tests/customer-groups-pages.test.js
git commit -m "feat: add customer group sidebar entry"
```

---

### Task 3: Customer group list page

**Files:**
- Create: `customer-groups.html`
- Create: `assets/js/pages/customer-groups-list.js`
- Modify: `assets/css/custom.css`
- Test: `tests/customer-groups-pages.test.js`

**Interfaces:**
- Consumes: `CustomerGroupsStore.createStore(window.localStorage)` and `getGroups()`.
- Produces: links `customer-group-form.html`, `customer-group-form.html?id=<id>`, and `customer-group-details.html?id=<id>`.
- DOM IDs: `group-search`, `status-filter`, `groups-table-body`, `groups-empty`, `groups-pagination`.

- [ ] **Step 1: Create the list page shell to satisfy its contract test**

Build a Bootstrap page with the existing `assets/css/bootstrap.min.css`, `assets/css/icons.min.css`, `assets/css/app.min.css`, and `assets/css/custom.css`. The content card must include this exact functional markup:

```html
<div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
  <div><h4 class="mb-1">Quản lý nhóm khách hàng</h4><p class="text-muted mb-0">Tổ chức và quản lý khách hàng theo từng nhóm.</p></div>
  <a href="customer-group-form.html" class="btn btn-primary"><i class="bi bi-plus-circle me-1"></i>Tạo nhóm khách hàng</a>
</div>
<div class="card">
  <div class="card-header"><div class="row g-2">
    <div class="col-md-8"><input id="group-search" class="form-control" type="search" placeholder="Tìm theo tên hoặc mô tả..."></div>
    <div class="col-md-4"><select id="status-filter" class="form-select"><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></div>
  </div></div>
  <div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0">
    <thead class="table-light"><tr><th>Nhóm khách hàng</th><th>Số thành viên</th><th>Trạng thái</th><th>Cập nhật</th><th class="text-end">Thao tác</th></tr></thead>
    <tbody id="groups-table-body"></tbody>
  </table></div><div id="groups-empty" class="customer-groups-empty d-none">Không có nhóm khách hàng phù hợp.</div></div>
  <div class="card-footer"><nav aria-label="Phân trang nhóm khách hàng"><ul id="groups-pagination" class="pagination justify-content-end mb-0"></ul></nav></div>
</div>
```

Include `#navbar-nav`, Bootstrap JS, then scripts in this order: `customer-groups-store.js`, `customer-groups-list.js`, `app.js`.

- [ ] **Step 2: Run the list page contract test**

Run: `node --test --test-name-pattern="customer-groups.html" tests/customer-groups-pages.test.js`

Expected: PASS.

- [ ] **Step 3: Implement list filtering, pagination and safe rendering**

In `customer-groups-list.js`, use `PAGE_SIZE = 6`, escape text before inserting HTML, reset page to 1 on search/filter, and render action links:

```js
const store = CustomerGroupsStore.createStore(window.localStorage);
const state = { query: '', status: '', page: 1 };
const PAGE_SIZE = 6;
const escapeHtml = (value) => { const el = document.createElement('div'); el.textContent = String(value ?? ''); return el.innerHTML; };
const formatDate = (value) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
function filteredGroups() {
  const query = state.query.toLocaleLowerCase('vi');
  return store.getGroups().filter((group) =>
    (!state.status || group.status === state.status) &&
    (!query || `${group.name} ${group.description}`.toLocaleLowerCase('vi').includes(query))
  ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
function render() {
  const groups = filteredGroups();
  const pages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const visible = groups.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
  document.getElementById('groups-table-body').innerHTML = visible.map((group) => `<tr><td><h6 class="mb-1">${escapeHtml(group.name)}</h6><span class="text-muted">${escapeHtml(group.description || 'Không có mô tả')}</span></td><td>${group.customerIds.length}</td><td><span class="badge ${group.status === 'active' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">${group.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span></td><td>${formatDate(group.updatedAt)}</td><td class="text-end"><a class="btn btn-sm btn-subtle-primary me-1" href="customer-group-details.html?id=${encodeURIComponent(group.id)}">Xem khách hàng</a><a class="btn btn-sm btn-subtle-secondary" href="customer-group-form.html?id=${encodeURIComponent(group.id)}">Chỉnh sửa</a></td></tr>`).join('');
  document.getElementById('groups-empty').classList.toggle('d-none', groups.length !== 0);
  document.getElementById('groups-pagination').innerHTML = Array.from({ length: pages }, (_, index) => `<li class="page-item ${state.page === index + 1 ? 'active' : ''}"><button class="page-link" data-page="${index + 1}">${index + 1}</button></li>`).join('');
}
```

Bind `input`, `change`, and pagination click events, then call `render()`.

- [ ] **Step 4: Add focused CSS**

Append to `assets/css/custom.css`:

```css
.customer-groups-empty { padding: 3rem 1rem; text-align: center; color: var(--bs-secondary-color); }
.customer-picker { max-height: 26rem; overflow-y: auto; }
.customer-picker-item { transition: background-color .15s ease; }
.customer-picker-item:hover { background: var(--bs-tertiary-bg); }
.customer-avatar { width: 40px; height: 40px; object-fit: cover; }
@media (max-width: 767.98px) { .customer-group-actions .btn { width: 100%; margin: .25rem 0 !important; } }
```

- [ ] **Step 5: Run all current automated tests**

Run: `node --test tests/customer-groups-store.test.js tests/customer-groups-pages.test.js`

Expected: storage tests and shared/list contract tests pass; form/detail contract tests still fail because those pages do not exist.

- [ ] **Step 6: Commit the list page**

```bash
git add customer-groups.html assets/js/pages/customer-groups-list.js assets/css/custom.css
git commit -m "feat: add customer group list page"
```

---

### Task 4: Create and edit group form

**Files:**
- Create: `customer-group-form.html`
- Create: `assets/js/pages/customer-group-form.js`
- Test: `tests/customer-groups-pages.test.js`

**Interfaces:**
- Consumes: store `getCustomers()`, `getGroup(id)`, `createGroup(input)`, `updateGroup(id, input)`.
- Produces: redirect to `customer-groups.html` after a successful save.
- DOM IDs: `customer-group-form`, `form-title`, `group-name`, `group-description`, `group-status`, `customer-search`, `customer-picker-list`, `selected-count`, `save-group-button`.

- [ ] **Step 1: Create the form page shell**

Use the same layout/assets as the list page. The form card must contain:

```html
<form id="customer-group-form" novalidate>
  <div class="card"><div class="card-header"><h5 id="form-title" class="mb-0">Tạo nhóm khách hàng</h5></div><div class="card-body">
    <div class="row g-3"><div class="col-md-8"><label for="group-name" class="form-label">Tên nhóm <span class="text-danger">*</span></label><input id="group-name" class="form-control" maxlength="100" required><div class="invalid-feedback">Vui lòng nhập tên nhóm.</div></div>
    <div class="col-md-4"><label for="group-status" class="form-label">Trạng thái</label><select id="group-status" class="form-select"><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></div>
    <div class="col-12"><label for="group-description" class="form-label">Mô tả</label><textarea id="group-description" class="form-control" rows="3" maxlength="500"></textarea></div></div>
  </div></div>
  <div class="card"><div class="card-header d-flex justify-content-between"><h5 class="mb-0">Chọn khách hàng</h5><span id="selected-count" class="badge bg-primary-subtle text-primary">0 đã chọn</span></div>
    <div class="card-body"><input id="customer-search" class="form-control mb-3" type="search" placeholder="Tìm theo tên, email hoặc số điện thoại..."><div id="customer-picker-list" class="customer-picker list-group list-group-flush"></div></div>
  </div>
  <div class="d-flex justify-content-end gap-2"><a href="customer-groups.html" class="btn btn-light">Huỷ</a><button id="save-group-button" class="btn btn-primary" type="submit">Lưu nhóm</button></div>
</form>
```

Include the same common scripts plus `customer-group-form.js`.

- [ ] **Step 2: Run the form contract test**

Run: `node --test --test-name-pattern="customer-group-form.html" tests/customer-groups-pages.test.js`

Expected: PASS.

- [ ] **Step 3: Implement persistent picker state and edit loading**

In `customer-group-form.js`, create `selectedIds = new Set()`, read `id` using `URLSearchParams`, load the group in edit mode, and render filtered customers without clearing selections hidden by search. Each checkbox uses `data-customer-id`; checkbox changes update the set and counter.

Use this notification fallback:

```js
function notify(icon, title, text) {
  if (window.Swal) return Swal.fire({ icon, title, text, confirmButtonText: 'Đồng ý' });
  window.alert([title, text].filter(Boolean).join('\n'));
  return Promise.resolve();
}
```

On an invalid edit ID, call `notify('error', 'Không tìm thấy nhóm', 'Nhóm khách hàng không tồn tại.').then(() => location.replace('customer-groups.html'))`.

- [ ] **Step 4: Implement submit validation and persistence**

On submit, add `was-validated`; stop if the name is blank. Build the exact input shape:

```js
const input = {
  name: document.getElementById('group-name').value,
  description: document.getElementById('group-description').value,
  status: document.getElementById('group-status').value,
  customerIds: [...selectedIds]
};
```

Call `updateGroup(groupId, input)` in edit mode or `createGroup(input)` in create mode. Catch store errors and show their message. After success, show `Đã cập nhật nhóm` or `Đã tạo nhóm`, then redirect to `customer-groups.html`.

- [ ] **Step 5: Run all current automated tests**

Run: `node --test tests/customer-groups-store.test.js tests/customer-groups-pages.test.js`

Expected: storage and list/form contract tests pass; only detail contract test remains failing.

- [ ] **Step 6: Commit the form**

```bash
git add customer-group-form.html assets/js/pages/customer-group-form.js
git commit -m "feat: add customer group create and edit form"
```

---

### Task 5: Group details and member removal

**Files:**
- Create: `customer-group-details.html`
- Create: `assets/js/pages/customer-group-details.js`
- Test: `tests/customer-groups-pages.test.js`

**Interfaces:**
- Consumes: store `getGroup(id)`, `getCustomers()`, `removeCustomer(groupId, customerId)`.
- Produces: updated member table and member count after confirmed removal.
- DOM IDs: `group-title`, `group-description-text`, `group-status-badge`, `member-count`, `member-search`, `members-table-body`, `members-empty`, `edit-group-link`.

- [ ] **Step 1: Create the detail page shell**

Use the common page layout and add this content:

```html
<div class="d-flex flex-wrap justify-content-between gap-2 mb-4"><div><h4 id="group-title" class="mb-1">Chi tiết nhóm khách hàng</h4><p id="group-description-text" class="text-muted mb-0"></p></div><a id="edit-group-link" class="btn btn-primary" href="#">Chỉnh sửa nhóm</a></div>
<div class="row"><div class="col-md-6"><div class="card"><div class="card-body"><span class="text-muted">Trạng thái</span><div><span id="group-status-badge" class="badge"></span></div></div></div></div><div class="col-md-6"><div class="card"><div class="card-body"><span class="text-muted">Thành viên</span><h3 id="member-count" class="mb-0">0</h3></div></div></div></div>
<div class="card"><div class="card-header"><input id="member-search" class="form-control" type="search" placeholder="Tìm thành viên theo tên, email hoặc số điện thoại..."></div><div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light"><tr><th>Khách hàng</th><th>Số điện thoại</th><th>Trạng thái</th><th class="text-end">Thao tác</th></tr></thead><tbody id="members-table-body"></tbody></table></div><div id="members-empty" class="customer-groups-empty d-none">Nhóm chưa có khách hàng phù hợp.</div></div></div>
```

Include SweetAlert2 CSS/JS, the store, `customer-group-details.js`, and `app.js`.

- [ ] **Step 2: Run the detail contract test**

Run: `node --test --test-name-pattern="customer-group-details.html" tests/customer-groups-pages.test.js`

Expected: PASS.

- [ ] **Step 3: Implement detail loading, search and safe member rendering**

Require a valid URL `id`; otherwise notify and redirect. Join `group.customerIds` with customers using a `Map`. Filter member fields with locale-aware lowercase search and render avatar/name/email, phone, localized status, plus a button with `data-remove-customer-id` and an accessible label containing the customer name.

- [ ] **Step 4: Implement confirmed member removal**

Use SweetAlert when present:

```js
async function confirmRemoval(customer) {
  if (window.Swal) {
    const result = await Swal.fire({
      icon: 'warning', title: 'Gỡ khách hàng khỏi nhóm?',
      text: `${customer.name} sẽ được gỡ khỏi nhóm này nhưng vẫn còn trong danh sách khách hàng chung.`,
      showCancelButton: true, confirmButtonText: 'Gỡ khỏi nhóm', cancelButtonText: 'Huỷ', confirmButtonColor: '#d33'
    });
    return result.isConfirmed;
  }
  return window.confirm(`Gỡ ${customer.name} khỏi nhóm này?`);
}
```

After confirmation, call `store.removeCustomer(groupId, customer.id)`, reload the group, render, and show `Đã gỡ khách hàng khỏi nhóm`. Cancelling must make no storage call.

- [ ] **Step 5: Run the complete automated suite**

Run: `node --test tests/customer-groups-store.test.js tests/customer-groups-pages.test.js`

Expected: all 10 tests pass, 0 fail.

- [ ] **Step 6: Commit the detail page**

```bash
git add customer-group-details.html assets/js/pages/customer-group-details.js
git commit -m "feat: add customer group member management"
```

---

### Task 6: Integration and visual verification

**Files:**
- Modify only files from Tasks 1–5 when verification exposes a defect.

**Interfaces:**
- Consumes: complete module and a local static HTTP server.
- Produces: verified desktop/mobile workflow with no console errors or broken asset requests caused by US02.

- [ ] **Step 1: Run automated verification from a clean state**

Run:

```bash
node --test tests/customer-groups-store.test.js tests/customer-groups-pages.test.js
git diff --check
git status --short
```

Expected: all tests pass; no whitespace errors; only intentional implementation files are modified/untracked.

- [ ] **Step 2: Start a local HTTP server**

Run: `python -m http.server 4173`

Expected: server listens at `http://127.0.0.1:4173/`.

- [ ] **Step 3: Verify the create/list persistence flow in a browser**

Open `http://127.0.0.1:4173/customer-groups.html`, then:

1. Confirm sidebar item and Vietnamese list page.
2. Create `Khách hàng VIP`, add a description, choose active status and two customers.
3. Confirm the new row, member count `2`, correct badge, and action links.
4. Reload and confirm the row persists.
5. Search by `VIP`, filter active/inactive, and exercise pagination after creating enough groups.

Expected: every state updates without console error.

- [ ] **Step 4: Verify edit, detail and removal semantics**

1. Edit `Khách hàng VIP`, rename it and change status.
2. Add one customer already used by a second test group.
3. Open details and search for that customer.
4. Cancel removal once and verify no change.
5. Confirm removal and verify the member count decreases.
6. Open the second group and verify the same customer remains there.

Expected: removal is group-local and the global customer remains selectable.

- [ ] **Step 5: Verify validation and error paths**

1. Try a blank name.
2. Try a duplicate name with different case and surrounding spaces.
3. Open `customer-group-form.html?id=missing`.
4. Open `customer-group-details.html?id=missing`.

Expected: clear Vietnamese feedback; invalid URLs return to the list; no uncaught errors.

- [ ] **Step 6: Verify responsive rendering**

Check the three pages at desktop width 1440×900 and mobile width 390×844.

Expected: no horizontal page overflow outside intended responsive tables; buttons remain usable; sidebar toggle works; picker scrolls within its card.

- [ ] **Step 7: Run final verification after any fixes**

Run: `node --test tests/customer-groups-store.test.js tests/customer-groups-pages.test.js`

Expected: all tests pass, 0 fail.

- [ ] **Step 8: Commit verification fixes if any**

```bash
git add customer-groups.html customer-group-form.html customer-group-details.html assets/js/app.js assets/js/pages/customer-groups-store.js assets/js/pages/customer-groups-list.js assets/js/pages/customer-group-form.js assets/js/pages/customer-group-details.js assets/css/custom.css tests/customer-groups-store.test.js tests/customer-groups-pages.test.js
git commit -m "fix: polish customer group management flow"
```

Skip this commit if verification required no code changes.
