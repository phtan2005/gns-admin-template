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
    customerIds: ['customer-1', 'customer-1', 'customer-2', 'customer-999']
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

test('sanitizes persisted group customer IDs by deduping and dropping unknown customers', () => {
  const validGroup = {
    id: 'group-dirty',
    name: 'Nhóm bẩn',
    description: '',
    status: 'active',
    customerIds: ['customer-1', 'customer-1', 'customer-999'],
    createdAt: '2026-07-15T07:00:00.000Z',
    updatedAt: '2026-07-15T08:00:00.000Z'
  };
  const { storage, store } = setup({
    [KEYS.groups]: JSON.stringify([validGroup])
  });

  assert.deepEqual(store.getGroups()[0].customerIds, ['customer-1']);
  assert.deepEqual(JSON.parse(storage.getItem(KEYS.groups))[0].customerIds, ['customer-1']);
  const created = store.createGroup({
    name: 'Nhóm mới',
    status: 'active',
    customerIds: ['customer-2', 'customer-2', 'customer-missing']
  });
  assert.deepEqual(created.customerIds, ['customer-2']);
  const updated = store.updateGroup('group-dirty', {
    name: 'Nhóm sạch',
    status: 'inactive',
    customerIds: ['customer-1', 'customer-404', 'customer-1']
  });
  assert.deepEqual(updated.customerIds, ['customer-1']);
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
  const validCustomer = DEFAULT_CUSTOMERS[0];
  const validGroup = {
    id: 'group-valid',
    name: 'Khách hàng thân thiết',
    description: '',
    status: 'active',
    customerIds: ['customer-1'],
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
