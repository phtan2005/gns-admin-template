(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CustomerGroupsStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KEYS = { customers: 'gns_customers_v1', groups: 'gns_customer_groups_v1' };
  const SEED_MIGRATION_KEY = 'gns_customers_seed_removed_v2';
  const DEFAULT_AVATAR = 'assets/images/users/32/user-dummy-img.jpg';
  const LEGACY_CUSTOMER_IDS = new Set(Array.from({ length: 8 }, (_, index) => `customer-${index + 1}`));

  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
  const isStatus = (value) => value === 'active' || value === 'inactive';
  const isCustomer = (customer) => isObject(customer)
    && isNonEmptyString(customer.id)
    && isNonEmptyString(customer.name)
    && typeof customer.email === 'string'
    && typeof customer.phone === 'string'
    && isStatus(customer.status)
    && typeof customer.avatar === 'string';
  const isGroup = (group) => isObject(group)
    && isNonEmptyString(group.id)
    && isNonEmptyString(group.name)
    && typeof group.description === 'string'
    && isStatus(group.status)
    && Array.isArray(group.customerIds)
    && group.customerIds.every(isNonEmptyString)
    && isNonEmptyString(group.createdAt)
    && isNonEmptyString(group.updatedAt);

  function createStore(storage, options = {}) {
    const now = options.now || (() => new Date().toISOString());
    const makeId = options.makeId || (() => `group-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const readArray = (key, isValid) => {
      try {
        const value = JSON.parse(storage.getItem(key));
        return Array.isArray(value) ? value.filter(isValid) : [];
      } catch (_) {
        return [];
      }
    };
    const write = (key, value) => storage.setItem(key, JSON.stringify(value));
    const readStoredArray = (key) => {
      try {
        const value = JSON.parse(storage.getItem(key));
        return Array.isArray(value) ? value : null;
      } catch (_) {
        return null;
      }
    };
    const migrateLegacyCustomers = () => {
      if (storage.getItem(SEED_MIGRATION_KEY) === '1') return;

      const customers = readStoredArray(KEYS.customers);
      if (customers) {
        const cleanedCustomers = customers.filter((customer) => !isObject(customer)
          || !LEGACY_CUSTOMER_IDS.has(customer.id));
        if (cleanedCustomers.length !== customers.length) write(KEYS.customers, cleanedCustomers);
      }

      const groups = readStoredArray(KEYS.groups);
      if (groups) {
        let changed = false;
        const cleanedGroups = groups.map((group) => {
          if (!isObject(group) || !Array.isArray(group.customerIds)) return group;
          const customerIds = group.customerIds.filter((id) => !LEGACY_CUSTOMER_IDS.has(id));
          if (customerIds.length === group.customerIds.length) return group;
          changed = true;
          return { ...group, customerIds };
        });
        if (changed) write(KEYS.groups, cleanedGroups);
      }

      storage.setItem(SEED_MIGRATION_KEY, '1');
    };
    const normalizeCustomerIds = (customerIds, customers = getCustomers()) => {
      const validIds = new Set(customers.map((customer) => customer.id));
      return Array.isArray(customerIds)
        ? [...new Set(customerIds.filter((id) => isNonEmptyString(id) && validIds.has(id)))]
        : [];
    };
    const getGroups = () => {
      const groups = readArray(KEYS.groups, isGroup);
      const customers = getCustomers();
      const sanitized = groups.map((group) => ({
        ...group,
        customerIds: normalizeCustomerIds(group.customerIds, customers)
      }));
      if (JSON.stringify(groups) !== JSON.stringify(sanitized)) write(KEYS.groups, sanitized);
      return sanitized;
    };
    const getGroup = (id) => getGroups().find((group) => group.id === id) || null;
    const getCustomers = () => readArray(KEYS.customers, isCustomer);
    const normalizePhone = (phone) => phone.replace(/[.\-\s()]/g, '');
    const normalizeCustomer = (input = {}, customers = getCustomers()) => {
      const name = String(input.name || '').trim();
      const email = String(input.email || '').trim().toLowerCase();
      const phone = String(input.phone || '').trim();
      const phoneKey = normalizePhone(phone);
      if (!name) throw new Error('Họ tên là bắt buộc.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email không hợp lệ.');
      if (!phoneKey) throw new Error('Số điện thoại là bắt buộc.');
      if (!isStatus(input.status)) throw new Error('Trạng thái khách hàng không hợp lệ.');

      if (customers.some((customer) => customer.email.trim().toLowerCase() === email)) {
        throw new Error('Email đã tồn tại.');
      }
      if (customers.some((customer) => normalizePhone(customer.phone) === phoneKey)) {
        throw new Error('Số điện thoại đã tồn tại.');
      }
      const avatar = String(input.avatar || '').trim() || DEFAULT_AVATAR;
      return { name, email, phone, status: input.status, avatar };
    };
    const createCustomer = (input) => {
      const customers = getCustomers();
      const normalized = normalizeCustomer(input, customers);
      const stamp = now();
      const customer = { id: makeId(), ...normalized, createdAt: stamp, updatedAt: stamp };
      try {
        write(KEYS.customers, [...customers, customer]);
      } catch (_) {
        throw new Error('Không thể lưu khách hàng. Bộ nhớ trình duyệt có thể đã đầy.');
      }
      return customer;
    };
    const normalize = (input, ignoredId) => {
      const name = String(input.name || '').trim();
      if (!name) throw new Error('Tên nhóm là bắt buộc.');
      if (!isStatus(input.status)) throw new Error('Trạng thái nhóm không hợp lệ.');
      if (getGroups().some((group) => group.id !== ignoredId
        && group.name.trim().toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'))) {
        throw new Error('Tên nhóm đã tồn tại.');
      }
      const customerIds = normalizeCustomerIds(input.customerIds);
      return {
        name,
        description: String(input.description || '').trim(),
        status: input.status,
        customerIds
      };
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
      return updateGroup(groupId, {
        ...group,
        customerIds: group.customerIds.filter((id) => id !== customerId)
      });
    };
    migrateLegacyCustomers();
    return { getCustomers, getGroups, getGroup, createCustomer, createGroup, updateGroup, removeCustomer };
  }

  return { KEYS, createStore };
});
