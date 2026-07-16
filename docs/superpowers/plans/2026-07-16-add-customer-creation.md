# Add Customer Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bỏ seed khách hàng mẫu và cho phép tạo khách hàng mới bằng modal trong form nhóm, tự động chọn khách hàng mới vào nhóm.

**Architecture:** Mở rộng `CustomerGroupsStore` để migration dữ liệu mẫu một lần và cung cấp `createCustomer`. Controller form quản lý modal, validation, đọc ảnh và refresh picker; DOM contract test giữ giao diện ổn định. Không thêm backend hoặc dependency.

**Tech Stack:** Vanilla JavaScript UMD, Bootstrap modal hiện có, FileReader/Image/Canvas, localStorage, Node built-in `node:test`.

## Global Constraints

- Không có backend/API/dependency mới.
- Không còn cơ chế tự tạo `DEFAULT_CUSTOMERS`.
- Migration dùng cờ `gns_customers_seed_removed_v2`, xoá đúng `customer-1` đến `customer-8` và gỡ các mã đó khỏi nhóm.
- Khách hàng mới có họ tên, email, điện thoại, trạng thái và avatar; email/điện thoại duy nhất.
- Ảnh JPG/PNG tối đa 3 MB, resize tối đa 256×256 px trước khi lưu.
- Toàn bộ nhãn, thông báo và lỗi dùng tiếng Việt.
- Khách hàng mới phải xuất hiện trong picker và tự động được chọn.
- Tất cả test hiện có phải tiếp tục đạt.

---

## File Map

- Modify `assets/js/pages/customer-groups-store.js`: bỏ seed, migration, schema customer và `createCustomer`.
- Modify `tests/customer-groups-store.test.js`: no-seed, migration, validation và persistence tests.
- Modify `customer-group-form.html`: nút **Thêm khách hàng**, modal, preview/avatar input và modal fields.
- Modify `assets/js/pages/customer-group-form.js`: modal lifecycle, validation, image resize, createCustomer và picker refresh.
- Modify `tests/customer-groups-pages.test.js`: modal/button/field contract.
- Modify `assets/css/custom.css`: preview/modal layout nhỏ nếu cần.

---

### Task 1: Customer store migration and create API

**Files:**
- Modify: `assets/js/pages/customer-groups-store.js`
- Modify: `tests/customer-groups-store.test.js`

**Interfaces:**
- Existing `createStore(storage, options)` remains compatible.
- New `createCustomer(input)` returns `{ id, name, email, phone, status, avatar, createdAt, updatedAt }`.
- Existing group APIs retain their signatures.

- [ ] **Step 1: Write failing tests**

Add tests using the existing memory storage helper:

```js
test('does not seed sample customers and migration removes legacy ids once', () => {
  const storage = memoryStorage({
    [KEYS.customers]: JSON.stringify([
      { id: 'customer-1', name: 'Mẫu 1', email: 'm1@example.com', phone: '0901', status: 'active' },
      { id: 'real-1', name: 'Khách thật', email: 'real@example.com', phone: '0999', status: 'active' }
    ]),
    [KEYS.groups]: JSON.stringify([{ id: 'group-1', name: 'A', description: '', status: 'active', customerIds: ['customer-1', 'real-1'], createdAt: '2026-07-16T00:00:00.000Z', updatedAt: '2026-07-16T00:00:00.000Z' }])
  });
  const store = createStore(storage, { now: () => '2026-07-16T01:00:00.000Z', makeId: () => 'real-2' });
  assert.deepEqual(store.getCustomers().map(({ id }) => id), ['real-1']);
  assert.deepEqual(store.getGroup('group-1').customerIds, ['real-1']);
  assert.equal(storage.getItem('gns_customers_seed_removed_v2'), '1');
});

test('creates a normalized customer and rejects duplicate email or phone', () => {
  const { store } = setup();
  const customer = store.createCustomer({ name: '  Trần A ', email: ' A@EXAMPLE.COM ', phone: '0901 234 567', status: 'active', avatar: 'default.jpg' });
  assert.equal(customer.name, 'Trần A');
  assert.equal(customer.email, 'a@example.com');
  assert.throws(() => store.createCustomer({ name: 'B', email: 'a@example.com', phone: '0908', status: 'active' }), /Email đã tồn tại/);
  assert.throws(() => store.createCustomer({ name: 'C', email: 'c@example.com', phone: '0901234567', status: 'active' }), /Số điện thoại đã tồn tại/);
});

test('rejects invalid customer fields', () => {
  const { store } = setup();
  assert.throws(() => store.createCustomer({ name: ' ', email: 'a@example.com', phone: '0901', status: 'active' }), /Họ tên/);
  assert.throws(() => store.createCustomer({ name: 'A', email: 'bad', phone: '0901', status: 'active' }), /Email/);
  assert.throws(() => store.createCustomer({ name: 'A', email: 'a@example.com', phone: '0901', status: 'paused' }), /Trạng thái/);
});
```

- [ ] **Step 2: Run the focused tests to verify RED**

Run: `node --test tests/customer-groups-store.test.js`.
Expected: FAIL because `createCustomer` is not exposed and the store still seeds defaults.

- [ ] **Step 3: Implement migration and API**

Use `SEED_MIGRATION_KEY = 'gns_customers_seed_removed_v2'` and legacy IDs `customer-1` through `customer-8`. On store initialization, filter those IDs from customers and every group, preserve group metadata and timestamps, write cleaned arrays, then set the migration flag. Do not create replacement customers.

Normalize customer input exactly as follows:

```js
const name = String(input.name || '').trim();
const email = String(input.email || '').trim().toLowerCase();
const phone = String(input.phone || '').trim();
const phoneKey = phone.replace(/[.\-\s()]/g, '');
if (!name) throw new Error('Họ tên là bắt buộc.');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email không hợp lệ.');
if (!phoneKey) throw new Error('Số điện thoại là bắt buộc.');
if (!['active', 'inactive'].includes(input.status)) throw new Error('Trạng thái khách hàng không hợp lệ.');
```

Reject duplicate normalized email/phone, use injected `makeId` and `now`, persist the customer, and expose `createCustomer`.

- [ ] **Step 4: Run GREEN and all tests**

Run: `node --test tests/customer-groups-store.test.js tests/customer-groups-pages.test.js`.
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add assets/js/pages/customer-groups-store.js tests/customer-groups-store.test.js
git commit -m "feat: add customer creation to group store"
```

---

### Task 2: Add-customer modal and image processing

**Files:**
- Modify: `customer-group-form.html`
- Modify: `assets/js/pages/customer-group-form.js`
- Modify: `tests/customer-groups-pages.test.js`
- Modify: `assets/css/custom.css` only if needed.

**Interfaces:**
- Consumes `store.createCustomer(input)`.
- Produces a new picker customer and adds its ID to `selectedIds`.
- DOM IDs: `add-customer-button`, `add-customer-modal`, `add-customer-form`, `new-customer-name`, `new-customer-email`, `new-customer-phone`, `new-customer-status`, `new-customer-avatar`, `new-customer-avatar-preview`, `save-new-customer`.

- [ ] **Step 1: Write failing contract test**

```js
test('customer group form exposes add-customer modal contract', () => {
  const html = read('customer-group-form.html');
  for (const id of ['add-customer-button', 'add-customer-modal', 'add-customer-form', 'new-customer-name', 'new-customer-email', 'new-customer-phone', 'new-customer-status', 'new-customer-avatar', 'new-customer-avatar-preview', 'save-new-customer']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /Tối đa 3 MB/);
});
```

- [ ] **Step 2: Run the contract test to verify RED**

Run: `node --test --test-name-pattern="add-customer modal" tests/customer-groups-pages.test.js`.
Expected: FAIL because the modal IDs do not exist.

- [ ] **Step 3: Add modal markup**

Add a Bootstrap modal next to the existing picker. Use `accept="image/jpeg,image/png"`, copy `Tối đa 3 MB`, labels, invalid feedback, cancel button and submit button `save-new-customer`.

- [ ] **Step 4: Implement modal controller and image helper**

Use `MAX_AVATAR_BYTES = 3 * 1024 * 1024`; reject non-JPEG/PNG or oversized files. Resize with canvas while preserving aspect ratio:

```js
const scale = Math.min(1, 256 / image.naturalWidth, 256 / image.naturalHeight);
canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
context.drawImage(image, 0, 0, canvas.width, canvas.height);
return canvas.toDataURL('image/jpeg', 0.82);
```

On submit call `store.createCustomer`, append the returned customer to the in-memory array, add its ID to `selectedIds`, render the picker, update the counter, hide/reset the modal and show success. On error keep the modal open and preserve group fields/selections.

- [ ] **Step 5: Run GREEN checks**

Run: `node --test tests/*.test.js; node --check assets/js/pages/customer-group-form.js; git diff --check`.
Expected: all tests pass and checks exit 0.

- [ ] **Step 6: Commit**

```bash
git add customer-group-form.html assets/js/pages/customer-group-form.js tests/customer-groups-pages.test.js assets/css/custom.css
git commit -m "feat: add customer creation modal"
```

---

### Task 3: Integration and preview verification

**Files:** Modify only files from Tasks 1–2 if verification finds a defect.

- [ ] **Step 1: Run verification**

```bash
node --test tests/*.test.js
node --check assets/js/pages/customer-groups-store.js
node --check assets/js/pages/customer-group-form.js
git diff --check
```

Expected: all tests pass, syntax checks exit 0 and diff check is clean.

- [ ] **Step 2: Verify fresh empty state**

Clear site storage, open `customer-group-form.html`, confirm no seed rows, empty-state copy and **Thêm khách hàng** button.

- [ ] **Step 3: Verify create flow**

Create a valid customer with a JPG/PNG under 3 MB. Confirm modal closes, picker refreshes, customer is selected and data persists after reload. Verify duplicate email/phone, invalid file type and over-3-MB file keep the modal open with Vietnamese errors.

- [ ] **Step 4: Verify migration**

Seed storage with a legacy `customer-1`, a real customer and a group referencing both. Reload and confirm only the real customer remains and group metadata/timestamps are unchanged.

- [ ] **Step 5: Commit verification fixes if needed**

```bash
git add customer-group-form.html assets/js/pages/customer-groups-store.js assets/js/pages/customer-group-form.js tests/customer-groups-store.test.js tests/customer-groups-pages.test.js assets/css/custom.css
git commit -m "fix: polish customer creation flow"
```

Skip this commit when verification finds no code changes.
