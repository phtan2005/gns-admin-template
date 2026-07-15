(function () {
  'use strict';

  function mountCustomerGroupsMenu() {
    const nav = document.getElementById('navbar-nav');
    if (!nav || document.getElementById('customer-groups-menu-item')) return;

    const page = window.location.pathname.split('/').pop() || '';
    const modulePages = [
      'customer-groups.html',
      'customer-group-form.html',
      'customer-group-details.html'
    ];
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
    if (button) {
      button.addEventListener('click', () => {
        document.body.classList.toggle('vertical-sidebar-enable');
      });
    }
  }

  function initializeApp() {
    mountCustomerGroupsMenu();
    bindMobileSidebar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
})();
