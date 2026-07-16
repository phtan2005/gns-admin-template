const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, KEYS } = require('../assets/js/pages/customer-groups-store.js');

const MIGRATION_KEY = 'gns_customers_seed_removed_v2';

function customer(overrides = {}) {
  return {
    id: 'real-1',
    name: 'Khách thật',
    email: 'real@example.com',
    phone: '0999',
    status: 'active',
    avatar: 'real.jpg',
    ...overrides
  };
}

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

test('does not seed sample customers when the customer key is absent', () => {
  const { storage, store } = setup();
  assert.deepEqual(store.getCustomers(), []);
  assert.equal(storage.getItem(KEYS.customers), null);
  assert.equal(storage.getItem(MIGRATION_KEY), '1');
});

test('migration removes legacy customer ids once and preserves group metadata', () => {
  const originalGroup = {
    id: 'group-1',
    name: 'A',
    description: 'Giữ nguyên',
    status: 'active',
    customerIds: ['customer-1', 'real-1'],
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:30:00.000Z'
  };
  const storage = memoryStorage({
    [KEYS.customers]: JSON.stringify([
      customer({ id: 'customer-1', name: 'Mẫu 1', email: 'm1@example.com', phone: '0901' }),
      customer()
    ]),
    [KEYS.groups]: JSON.stringify([originalGroup])
  });
  const store = createStore(storage, {
    now: () => '2026-07-16T01:00:00.000Z',
    makeId: () => 'real-2'
  });

  assert.deepEqual(store.getCustomers().map(({ id }) => id), ['real-1']);
  assert.deepEqual(store.getGroup('group-1'), {
    ...originalGroup,
    customerIds: ['real-1']
  });
  assert.equal(storage.getItem(MIGRATION_KEY), '1');

  storage.setItem(KEYS.customers, JSON.stringify([
    customer(),
    customer({ id: 'customer-2', name: 'Dữ liệu thêm sau migration', email: 'later@example.com', phone: '0888' })
  ]));
  assert.deepEqual(store.getCustomers().map(({ id }) => id), ['real-1', 'customer-2']);
});

test('creates and persists a normalized customer', () => {
  const storage = memoryStorage();
  const store = createStore(storage, {
    now: () => '2026-07-16T01:00:00.000Z',
    makeId: () => 'customer-new'
  });
  const created = store.createCustomer({
    name: '  Trần A ',
    email: ' A@EXAMPLE.COM ',
    phone: ' 0901 234 567 ',
    status: 'active',
    avatar: 'data:image/jpeg;base64,abc'
  });

  assert.deepEqual(created, {
    id: 'customer-new',
    name: 'Trần A',
    email: 'a@example.com',
    phone: '0901 234 567',
    status: 'active',
    avatar: 'data:image/jpeg;base64,abc',
    createdAt: '2026-07-16T01:00:00.000Z',
    updatedAt: '2026-07-16T01:00:00.000Z'
  });
  assert.deepEqual(JSON.parse(storage.getItem(KEYS.customers)), [created]);
});

test('rejects duplicate normalized customer email or phone', () => {
  const { store } = setup({
    [KEYS.customers]: JSON.stringify([customer({ phone: '(0901) 234-567' })])
  });

  assert.throws(() => store.createCustomer({
    name: 'B', email: ' REAL@EXAMPLE.COM ', phone: '0908', status: 'active'
  }), /Email đã tồn tại/);
  assert.throws(() => store.createCustomer({
    name: 'C', email: 'c@example.com', phone: '0901234567', status: 'active'
  }), /Số điện thoại đã tồn tại/);
});

test('rejects invalid customer fields with Vietnamese messages', () => {
  const { store } = setup();
  assert.throws(() => store.createCustomer({
    name: ' ', email: 'a@example.com', phone: '0901', status: 'active'
  }), /Họ tên là bắt buộc/);
  assert.throws(() => store.createCustomer({
    name: 'A', email: 'bad', phone: '0901', status: 'active'
  }), /Email không hợp lệ/);
  assert.throws(() => store.createCustomer({
    name: 'A', email: 'a@example.com', phone: ' .-() ', status: 'active'
  }), /Số điện thoại là bắt buộc/);
  assert.throws(() => store.createCustomer({
    name: 'A', email: 'a@example.com', phone: '0901', status: 'paused'
  }), /Trạng thái khách hàng không hợp lệ/);
});

test('uses the existing default avatar when none is provided', () => {
  const { store } = setup();
  const created = store.createCustomer({
    name: 'A', email: 'a@example.com', phone: '0901', status: 'active'
  });

  assert.equal(created.avatar, 'assets/images/users/32/user-dummy-img.jpg');
});

test('reports customer persistence failures in Vietnamese', () => {
  const storage = memoryStorage();
  const store = createStore(storage, {
    now: () => '2026-07-16T01:00:00.000Z',
    makeId: () => 'customer-new'
  });
  const setItem = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === KEYS.customers) throw new Error('QuotaExceededError');
    setItem(key, value);
  };

  assert.throws(() => store.createCustomer({
    name: 'A', email: 'a@example.com', phone: '0901', status: 'active'
  }), /Không thể lưu khách hàng/);
});

test('creates and reloads a normalized group', () => {
  const { store } = setup({
    [KEYS.customers]: JSON.stringify([
      customer(),
      customer({ id: 'real-2', name: 'Khách 2', email: 'real2@example.com', phone: '0888' })
    ])
  });
  const created = store.createGroup({
    name: '  Khách hàng VIP  ', description: ' Ưu tiên ', status: 'active',
    customerIds: ['real-1', 'real-1', 'real-2', 'customer-999']
  });
  assert.deepEqual(created, {
    id: 'group-test', name: 'Khách hàng VIP', description: 'Ưu tiên', status: 'active',
    customerIds: ['real-1', 'real-2'],
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

test('rejects invalid status and duplicate names during update', () => {
  let sequence = 0;
  const store = createStore(memoryStorage(), {
    now: () => '2026-07-15T08:00:00.000Z', makeId: () => `group-${++sequence}`
  });
  store.createGroup({ name: 'A', status: 'active' });
  store.createGroup({ name: 'B', status: 'inactive' });
  assert.throws(() => store.updateGroup('group-1', { name: 'A', status: 'paused' }), /Trạng thái nhóm không hợp lệ/);
  assert.throws(() => store.updateGroup('group-2', { name: ' a ', status: 'active' }), /Tên nhóm đã tồn tại/);
});

test('updates a group while preserving createdAt', () => {
  const { store } = setup({
    [KEYS.customers]: JSON.stringify([
      customer(),
      customer({ id: 'real-2', name: 'Khách 2', email: 'real2@example.com', phone: '0888' })
    ])
  });
  store.createGroup({ name: 'VIP', status: 'active', customerIds: ['real-1'] });
  const updated = store.updateGroup('group-test', {
    name: 'VIP mới', description: 'Đã sửa', status: 'inactive', customerIds: ['real-2']
  });
  assert.equal(updated.createdAt, '2026-07-15T08:00:00.000Z');
  assert.equal(updated.name, 'VIP mới');
  assert.deepEqual(updated.customerIds, ['real-2']);
});

test('a customer can belong to multiple groups and removal affects one group only', () => {
  let sequence = 0;
  const storage = memoryStorage({ [KEYS.customers]: JSON.stringify([customer()]) });
  const store = createStore(storage, {
    now: () => '2026-07-15T08:00:00.000Z', makeId: () => `group-${++sequence}`
  });
  store.createGroup({ name: 'A', status: 'active', customerIds: ['real-1'] });
  store.createGroup({ name: 'B', status: 'active', customerIds: ['real-1'] });
  store.removeCustomer('group-1', 'real-1');
  assert.deepEqual(store.getGroup('group-1').customerIds, []);
  assert.deepEqual(store.getGroup('group-2').customerIds, ['real-1']);
  assert.ok(store.getCustomers().some(({ id }) => id === 'real-1'));
});

test('sanitizes persisted group customer IDs by deduping and dropping unknown customers', () => {
  const validGroup = {
    id: 'group-dirty',
    name: 'Nhóm bẩn',
    description: '',
    status: 'active',
    customerIds: ['real-1', 'real-1', 'customer-999'],
    createdAt: '2026-07-15T07:00:00.000Z',
    updatedAt: '2026-07-15T08:00:00.000Z'
  };
  const { storage, store } = setup({
    [KEYS.customers]: JSON.stringify([
      customer(),
      customer({ id: 'real-2', name: 'Khách 2', email: 'real2@example.com', phone: '0888' })
    ]),
    [KEYS.groups]: JSON.stringify([validGroup])
  });

  assert.deepEqual(store.getGroups()[0].customerIds, ['real-1']);
  assert.deepEqual(JSON.parse(storage.getItem(KEYS.groups))[0].customerIds, ['real-1']);
  const created = store.createGroup({
    name: 'Nhóm mới',
    status: 'active',
    customerIds: ['real-2', 'real-2', 'customer-missing']
  });
  assert.deepEqual(created.customerIds, ['real-2']);
  const updated = store.updateGroup('group-dirty', {
    name: 'Nhóm sạch',
    status: 'inactive',
    customerIds: ['real-1', 'customer-404', 'real-1']
  });
  assert.deepEqual(updated.customerIds, ['real-1']);
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

test('filters malformed records while preserving valid stored records', () => {
  const validCustomer = customer();
  const validGroup = {
    id: 'group-valid',
    name: 'Khách hàng thân thiết',
    description: '',
    status: 'active',
    customerIds: ['real-1'],
    createdAt: '2026-07-15T07:00:00.000Z',
    updatedAt: '2026-07-15T08:00:00.000Z'
  };
  const { store } = setup({
    [KEYS.customers]: JSON.stringify([
      validCustomer,
      null,
      { ...validCustomer, id: '' },
      { ...validCustomer, status: 'paused' }
    ]),
    [KEYS.groups]: JSON.stringify([
      validGroup,
      null,
      { ...validGroup, id: 42 },
      { ...validGroup, customerIds: 'customer-1' },
      { ...validGroup, status: 'paused' }
    ])
  });

  assert.deepEqual(store.getCustomers(), [validCustomer]);
  assert.deepEqual(store.getGroups(), [validGroup]);
});
