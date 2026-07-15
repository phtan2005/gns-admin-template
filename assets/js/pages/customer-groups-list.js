(function () {
  'use strict';

  const store = CustomerGroupsStore.createStore(window.localStorage);
  const state = { query: '', status: '', page: 1 };
  const PAGE_SIZE = 6;

  const escapeHtml = (value) => {
    const element = document.createElement('div');
    element.textContent = String(value ?? '');
    return element.innerHTML;
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  function filteredGroups() {
    const query = state.query.toLocaleLowerCase('vi');
    return store.getGroups()
      .filter((group) => (
        (!state.status || group.status === state.status)
        && (!query || (group.name + ' ' + group.description).toLocaleLowerCase('vi').includes(query))
      ))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  function groupRow(group) {
    const statusClass = group.status === 'active'
      ? 'bg-success-subtle text-success'
      : 'bg-secondary-subtle text-secondary';
    const statusLabel = group.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động';
    const detailsUrl = 'customer-group-details.html?id=' + encodeURIComponent(group.id);
    const editUrl = 'customer-group-form.html?id=' + encodeURIComponent(group.id);

    return '<tr>'
      + '<td><h6 class="mb-1">' + escapeHtml(group.name) + '</h6>'
      + '<span class="text-muted">' + escapeHtml(group.description || 'Không có mô tả') + '</span></td>'
      + '<td>' + group.customerIds.length + '</td>'
      + '<td><span class="badge ' + statusClass + '">' + statusLabel + '</span></td>'
      + '<td>' + formatDate(group.updatedAt) + '</td>'
      + '<td class="text-end customer-group-actions">'
      + '<a class="btn btn-sm btn-subtle-primary me-1" href="' + detailsUrl + '">Xem khách hàng</a>'
      + '<a class="btn btn-sm btn-subtle-secondary" href="' + editUrl + '">Chỉnh sửa</a>'
      + '</td></tr>';
  }

  function renderPagination(pages) {
    return Array.from({ length: pages }, (_, index) => {
      const page = index + 1;
      const activeClass = state.page === page ? ' active' : '';
      const current = state.page === page ? ' aria-current="page"' : '';
      return '<li class="page-item' + activeClass + '">'
        + '<button class="page-link" type="button" data-page="' + page + '"' + current + '>'
        + page + '</button></li>';
    }).join('');
  }

  function render() {
    const groups = filteredGroups();
    const pages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * PAGE_SIZE;
    const visible = groups.slice(start, start + PAGE_SIZE);

    document.getElementById('groups-table-body').innerHTML = visible.map(groupRow).join('');
    document.getElementById('groups-empty').classList.toggle('d-none', groups.length !== 0);
    document.getElementById('groups-pagination').innerHTML = renderPagination(pages);
  }

  document.getElementById('group-search').addEventListener('input', (event) => {
    state.query = event.target.value.trim();
    state.page = 1;
    render();
  });

  document.getElementById('status-filter').addEventListener('change', (event) => {
    state.status = event.target.value;
    state.page = 1;
    render();
  });

  document.getElementById('groups-pagination').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page]');
    if (!button) return;
    state.page = Number(button.dataset.page);
    render();
  });

  render();
})();
