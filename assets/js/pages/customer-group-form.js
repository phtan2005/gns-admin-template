(function () {
  'use strict';

  const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
  const MAX_AVATAR_DIMENSION = 256;
  const DEFAULT_AVATAR = 'assets/images/users/32/user-dummy-img.jpg';
  const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png']);
  const store = CustomerGroupsStore.createStore(window.localStorage);
  const selectedIds = new Set();
  const params = new URLSearchParams(window.location.search);
  const isEditMode = params.has('id');
  const groupId = params.get('id');
  let customers = store.getCustomers();
  let avatarVersion = 0;
  let avatarProcessing = Promise.resolve(DEFAULT_AVATAR);
  const form = document.getElementById('customer-group-form');
  const nameInput = document.getElementById('group-name');
  const descriptionInput = document.getElementById('group-description');
  const statusInput = document.getElementById('group-status');
  const searchInput = document.getElementById('customer-search');
  const pickerList = document.getElementById('customer-picker-list');
  const selectedCount = document.getElementById('selected-count');
  const saveButton = document.getElementById('save-group-button');
  const addCustomerModalElement = document.getElementById('add-customer-modal');
  const addCustomerModal = bootstrap.Modal.getOrCreateInstance(addCustomerModalElement);
  const addCustomerForm = document.getElementById('add-customer-form');
  const newCustomerNameInput = document.getElementById('new-customer-name');
  const newCustomerEmailInput = document.getElementById('new-customer-email');
  const newCustomerPhoneInput = document.getElementById('new-customer-phone');
  const newCustomerStatusInput = document.getElementById('new-customer-status');
  const newCustomerAvatarInput = document.getElementById('new-customer-avatar');
  const newCustomerAvatarPreview = document.getElementById('new-customer-avatar-preview');
  const newCustomerError = document.getElementById('new-customer-error');
  const saveNewCustomerButton = document.getElementById('save-new-customer');

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
    avatar.src = customer.avatar || DEFAULT_AVATAR;
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
      empty.textContent = customers.length
        ? 'Không tìm thấy khách hàng phù hợp.'
        : 'Chưa có khách hàng. Hãy thêm khách hàng mới để bắt đầu.';
      pickerList.append(empty);
      return;
    }

    pickerList.append(...visibleCustomers.map(createCustomerItem));
  }

  function showNewCustomerError(message) {
    newCustomerError.textContent = message || '';
    newCustomerError.classList.toggle('d-none', !message);
  }

  function validateAvatar(file) {
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      throw new Error('Ảnh đại diện phải là tệp JPG hoặc PNG.');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new Error('Ảnh đại diện không được vượt quá 3 MB.');
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result));
      reader.addEventListener('error', () => reject(new Error('Không thể đọc ảnh đại diện.')));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', () => reject(new Error('Ảnh đại diện không hợp lệ.')));
      image.src = source;
    });
  }

  async function resizeAvatar(file) {
    validateAvatar(file);
    const source = await readFileAsDataUrl(file);
    const image = await loadImage(source);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Ảnh đại diện không hợp lệ.');

    const scale = Math.min(
      1,
      MAX_AVATAR_DIMENSION / image.naturalWidth,
      MAX_AVATAR_DIMENSION / image.naturalHeight
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không thể xử lý ảnh đại diện.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  function resetNewCustomerForm() {
    avatarVersion += 1;
    avatarProcessing = Promise.resolve(DEFAULT_AVATAR);
    addCustomerForm.reset();
    addCustomerForm.classList.remove('was-validated');
    newCustomerNameInput.setCustomValidity('');
    newCustomerPhoneInput.setCustomValidity('');
    newCustomerAvatarInput.setCustomValidity('');
    newCustomerAvatarPreview.src = DEFAULT_AVATAR;
    showNewCustomerError('');
    saveNewCustomerButton.disabled = false;
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
  [newCustomerNameInput, newCustomerEmailInput, newCustomerPhoneInput].forEach((input) => {
    input.addEventListener('input', () => {
      input.setCustomValidity('');
      showNewCustomerError('');
    });
  });

  newCustomerAvatarInput.addEventListener('change', () => {
    const file = newCustomerAvatarInput.files[0];
    const version = ++avatarVersion;
    newCustomerAvatarInput.setCustomValidity('');
    showNewCustomerError('');

    if (!file) {
      newCustomerAvatarPreview.src = DEFAULT_AVATAR;
      avatarProcessing = Promise.resolve(DEFAULT_AVATAR);
      return;
    }

    avatarProcessing = resizeAvatar(file)
      .then((avatar) => {
        if (version === avatarVersion) newCustomerAvatarPreview.src = avatar;
        return avatar;
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Không thể xử lý ảnh đại diện.';
        if (version === avatarVersion) {
          newCustomerAvatarInput.setCustomValidity(message);
          newCustomerAvatarPreview.src = DEFAULT_AVATAR;
          showNewCustomerError(message);
          addCustomerForm.classList.add('was-validated');
        }
        return null;
      });
  });

  addCustomerModalElement.addEventListener('hidden.bs.modal', resetNewCustomerForm);

  addCustomerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    showNewCustomerError('');
    newCustomerNameInput.setCustomValidity(
      newCustomerNameInput.value.trim() ? '' : 'Vui lòng nhập họ tên khách hàng.'
    );
    newCustomerPhoneInput.setCustomValidity(
      newCustomerPhoneInput.value.trim() ? '' : 'Vui lòng nhập số điện thoại.'
    );
    addCustomerForm.classList.add('was-validated');
    if (!addCustomerForm.checkValidity()) return;

    saveNewCustomerButton.disabled = true;
    try {
      const avatar = await avatarProcessing;
      if (!avatar) return;
      const customer = store.createCustomer({
        name: newCustomerNameInput.value,
        email: newCustomerEmailInput.value,
        phone: newCustomerPhoneInput.value,
        status: newCustomerStatusInput.value,
        avatar
      });
      customers = store.getCustomers();
      selectedIds.add(customer.id);
      searchInput.value = '';
      renderCustomers();
      updateSelectedCount();
      resetNewCustomerForm();
      addCustomerModal.hide();
      notify('success', 'Đã thêm khách hàng', customer.name + ' đã được chọn vào nhóm.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi thêm khách hàng.';
      showNewCustomerError(message);
    } finally {
      saveNewCustomerButton.disabled = false;
    }
  });

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
