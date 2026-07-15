(function () {
  'use strict';

  const store = CustomerGroupsStore.createStore(window.localStorage);
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get('id');
  const memberSearch = document.getElementById('member-search');
  const tableBody = document.getElementById('members-table-body');
  const emptyState = document.getElementById('members-empty');
  let group = null;

  const escapeHtml = (value) => {
    const element = document.createElement('div');
    element.textContent = String(value ?? '');
    return element.innerHTML;
  };

  const statusLabel = (status) => status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động';
  const statusClass = (status) => status === 'active'
    ? 'bg-success-subtle text-success'
    : 'bg-secondary-subtle text-secondary';

  function notify(icon, title, text) {
    if (window.Swal) {
      return Promise.resolve(window.Swal.fire({ icon, title, text, confirmButtonText: 'Đồng ý' }));
    }
    window.alert([title, text].filter(Boolean).join('\n'));
    return Promise.resolve();
  }

  function confirmRemoval(customer) {
    if (window.Swal) {
      return Promise.resolve(window.Swal.fire({
        icon: 'warning',
        title: 'Gỡ khách hàng khỏi nhóm?',
        text: `${customer.name} sẽ được gỡ khỏi nhóm này nhưng vẫn còn trong danh sách khách hàng chung.`,
        showCancelButton: true,
        confirmButtonText: 'Gỡ khỏi nhóm',
        cancelButtonText: 'Huỷ',
        confirmButtonColor: '#d33'
      })).then((result) => result.isConfirmed);
    }
    return Promise.resolve(window.confirm(`Gỡ ${customer.name} khỏi nhóm này?`));
  }

  function members() {
    if (!group) return [];
    const customersById = new Map(store.getCustomers().map((customer) => [customer.id, customer]));
    return group.customerIds.map((id) => customersById.get(id)).filter(Boolean);
  }

  function customerMatches(customer, query) {
    return [customer.name, customer.email, customer.phone]
      .join(' ')
      .toLocaleLowerCase('vi')
      .includes(query);
  }

  function memberRow(customer) {
    const label = `Gỡ ${customer.name} khỏi nhóm`;
    return '<tr>'
      + '<td><div class="d-flex align-items-center gap-2">'
      + '<img class="customer-avatar rounded-circle" src="' + escapeHtml(customer.avatar) + '" alt="">'
      + '<div><div class="fw-semibold">' + escapeHtml(customer.name) + '</div>'
      + '<div class="small text-muted text-break">' + escapeHtml(customer.email) + '</div></div></div></td>'
      + '<td>' + escapeHtml(customer.phone) + '</td>'
      + '<td><span class="badge ' + statusClass(customer.status) + '">' + statusLabel(customer.status) + '</span></td>'
      + '<td class="text-end"><button type="button" class="btn btn-sm btn-subtle-danger" data-remove-customer-id="'
      + escapeHtml(customer.id) + '" aria-label="' + escapeHtml(label) + '"><i class="ri-user-unfollow-line"></i> Gỡ khỏi nhóm</button></td>'
      + '</tr>';
  }

  function render() {
    const query = memberSearch.value.trim().toLocaleLowerCase('vi');
    const visible = members().filter((customer) => customerMatches(customer, query));
    tableBody.innerHTML = visible.map(memberRow).join('');
    emptyState.classList.toggle('d-none', visible.length !== 0);
    document.getElementById('member-count').textContent = String(members().length);
  }

  function renderGroup() {
    document.title = `${group.name} | GNS Admin`;
    document.getElementById('group-title').textContent = group.name;
    document.getElementById('group-description-text').textContent = group.description || 'Không có mô tả';
    const badge = document.getElementById('group-status-badge');
    badge.className = `badge ${statusClass(group.status)}`;
    badge.textContent = statusLabel(group.status);
    document.getElementById('edit-group-link').href = `customer-group-form.html?id=${encodeURIComponent(group.id)}`;
    render();
  }

  function loadGroup() {
    group = groupId ? store.getGroup(groupId) : null;
    if (!group) {
      notify('error', 'Không tìm thấy nhóm', 'Nhóm khách hàng không tồn tại.')
        .then(() => window.location.replace('customer-groups.html'));
      return false;
    }
    renderGroup();
    return true;
  }

  memberSearch.addEventListener('input', render);
  tableBody.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-remove-customer-id]');
    if (!button || !group) return;
    const customer = members().find((item) => item.id === button.dataset.removeCustomerId);
    if (!customer || !(await confirmRemoval(customer))) return;
    try {
      store.removeCustomer(group.id, customer.id);
      group = store.getGroup(group.id);
      renderGroup();
      await notify('success', 'Đã gỡ khách hàng khỏi nhóm');
    } catch (error) {
      await notify('error', 'Không thể gỡ khách hàng', error instanceof Error ? error.message : 'Đã xảy ra lỗi.');
    }
  });

  loadGroup();
})();
