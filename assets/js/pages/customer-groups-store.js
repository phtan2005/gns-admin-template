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
    const getCustomers = () => {
      if (storage.getItem(KEYS.customers) === null) write(KEYS.customers, DEFAULT_CUSTOMERS);
      return readArray(KEYS.customers, isCustomer);
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
    return { getCustomers, getGroups, getGroup, createGroup, updateGroup, removeCustomer };
  }

  return { KEYS, DEFAULT_CUSTOMERS, createStore };
});
