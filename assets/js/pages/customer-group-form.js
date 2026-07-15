(function () {
  'use strict';

  const store = CustomerGroupsStore.createStore(window.localStorage);
  const selectedIds = new Set();
  const params = new URLSearchParams(window.location.search);
  const isEditMode = params.has('id');
  const groupId = params.get('id');
  const customers = store.getCustomers();
  const form = document.getElementById('customer-group-form');
  const nameInput = document.getElementById('group-name');
  const descriptionInput = document.getElementById('group-description');
  const statusInput = document.getElementById('group-status');
  const searchInput = document.getElementById('customer-search');
  const pickerList = document.getElementById('customer-picker-list');
  const selectedCount = document.getElementById('selected-count');
  const saveButton = document.getElementById('save-group-button');

  function notify(icon, title, text) {
    if (window.Swal) return Swal.fire({ icon, title, text, confirmButtonText: 'Đồng ý' });
    window.alert([title, text].filter(Boolean).join('\n'));
    return Promise.resolve();
  }

  function updateSelectedCount() {
    selectedCount.textContent = selectedIds.size + ' đã chọn';
  }

  function customerMatches(customer, query) {
    return [customer.name, customer.email, customer.phone]
      .join(' ')
      .toLocaleLowerCase('vi')
      .includes(query);
  }

  function createCustomerItem(customer) {
    const item = document.createElement('label');
    item.className = 'customer-picker-item list-group-item d-flex align-items-center gap-3 px-0';

    const checkbox = document.createElement('input');
    checkbox.className = 'form-check-input flex-shrink-0 mt-0';
    checkbox.type = 'checkbox';
    checkbox.dataset.customerId = customer.id;
    checkbox.checked = selectedIds.has(customer.id);

    const avatar = document.createElement('img');
    avatar.className = 'customer-avatar rounded-circle flex-shrink-0';
    avatar.src = customer.avatar;
    avatar.alt = '';

    const details = document.createElement('span');
    details.className = 'min-w-0';

    const name = document.createElement('span');
    name.className = 'd-block fw-semibold text-body';
    name.textContent = customer.name;

    const contact = document.createElement('span');
    contact.className = 'd-block small text-muted text-break';
    contact.textContent = [customer.email, customer.phone].filter(Boolean).join(' · ');

    details.append(name, contact);
    item.append(checkbox, avatar, details);
    return item;
  }

  function renderCustomers() {
    const query = searchInput.value.trim().toLocaleLowerCase('vi');
    const visibleCustomers = customers.filter((customer) => customerMatches(customer, query));
    pickerList.replaceChildren();

    if (!visibleCustomers.length) {
      const empty = document.createElement('div');
      empty.className = 'py-4 text-center text-muted';
      empty.textContent = 'Không tìm thấy khách hàng phù hợp.';
      pickerList.append(empty);
      return;
    }

    pickerList.append(...visibleCustomers.map(createCustomerItem));
  }

  function loadGroup() {
    if (!isEditMode) return true;
    const group = store.getGroup(groupId);
    if (!group) {
      saveButton.disabled = true;
      notify('error', 'Không tìm thấy nhóm', 'Nhóm khách hàng không tồn tại.')
        .then(() => window.location.replace('customer-groups.html'));
      return false;
    }

    document.title = 'Chỉnh sửa nhóm khách hàng | GNS Admin';
    document.getElementById('form-title').textContent = 'Chỉnh sửa nhóm khách hàng';
    nameInput.value = group.name;
    descriptionInput.value = group.description;
    statusInput.value = group.status;
    group.customerIds.forEach((id) => selectedIds.add(id));
    saveButton.textContent = 'Cập nhật nhóm';
    return true;
  }

  pickerList.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[data-customer-id]');
    if (!checkbox) return;
    if (checkbox.checked) selectedIds.add(checkbox.dataset.customerId);
    else selectedIds.delete(checkbox.dataset.customerId);
    updateSelectedCount();
  });

  searchInput.addEventListener('input', renderCustomers);
  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    form.classList.add('was-validated');
    nameInput.setCustomValidity(nameInput.value.trim() ? '' : 'Vui lòng nhập tên nhóm.');
    if (!form.checkValidity()) return;

    const input = {
      name: document.getElementById('group-name').value,
      description: document.getElementById('group-description').value,
      status: document.getElementById('group-status').value,
      customerIds: [...selectedIds]
    };

    saveButton.disabled = true;
    try {
      if (isEditMode) store.updateGroup(groupId, input);
      else store.createGroup(input);
      const title = isEditMode ? 'Đã cập nhật nhóm' : 'Đã tạo nhóm';
      notify('success', title).then(() => window.location.replace('customer-groups.html'));
    } catch (error) {
      saveButton.disabled = false;
      const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lưu nhóm.';
      notify('error', 'Không thể lưu nhóm', message);
    }
  });

  if (loadGroup()) {
    updateSelectedCount();
    renderCustomers();
  }
})();
