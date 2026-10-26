document.addEventListener('DOMContentLoaded', () => {
    // Initial mock data if localStorage is empty
    const initialCustomers = [
        { id: 'CUS-001', name: 'Nguyễn Văn An', email: 'an.nguyen@gmail.com', phone: '0901234567', spending: 15500000, tier: 'Gold', status: 'Active' },
        { id: 'CUS-002', name: 'Trần Thị Bích', email: 'bich.tran@yahoo.com', phone: '0912345678', spending: 4200000, tier: 'Silver', status: 'Active' },
        { id: 'CUS-003', name: 'Lê Minh Cường', email: 'cuong.le@hotmail.com', phone: '0987654321', spending: 800000, tier: 'Bronze', status: 'Inactive' },
        { id: 'CUS-004', name: 'Pham Hoàng Dũng', email: 'dung.pham@gmail.com', phone: '0933445566', spending: 21000000, tier: 'Gold', status: 'Active' }
    ];

    // State management
    let customers = JSON.parse(localStorage.getItem('yums_customers')) || initialCustomers;

    // DOM Elements
    const tableBody = document.getElementById('customersTableBody');
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    // Summary Elements
    const totalCustomersEl = document.getElementById('totalCustomers');
    const totalMembersEl = document.getElementById('totalMembers');
    const activeCustomersEl = document.getElementById('activeCustomers');

    // Modals
    const addModal = document.getElementById('customerModal');
    const editModal = document.getElementById('editCustomerModal');

    // Forms
    const addForm = document.getElementById('customerForm');
    const editForm = document.getElementById('editCustomerForm');

    // Save customers to localStorage
    function saveCustomers() {
        localStorage.setItem('yums_customers', JSON.stringify(customers));
    }

    // Format currency to VND
    function formatVND(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }

    // Update Summary Dashboard Cards
    function updateSummary() {
        const total = customers.length;
        const members = customers.filter(c => c.tier === 'Gold' || c.tier === 'Silver').length;
        const active = customers.filter(c => c.status === 'Active').length;

        if (totalCustomersEl) totalCustomersEl.textContent = total;
        if (totalMembersEl) totalMembersEl.textContent = members;
        if (activeCustomersEl) activeCustomersEl.textContent = active;
    }

    // Render Table Rows
    function renderTable(data = customers) {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
                        No customer data found.
                    </td>
                </tr>`;
            return;
        }

        data.forEach(customer => {
            const tr = document.createElement('tr');

            const tierClass = (customer.tier || 'bronze').toLowerCase();
            const statusClass = customer.status === 'Active' ? 'badge-active' : 'badge-inactive';

            tr.innerHTML = `
                <td><strong class="cus-id">${customer.id}</strong></td>
                <td>${customer.name}</td>
                <td>${customer.email}</td>
                <td>${customer.phone}</td>
                <td style="text-align: right;">${formatVND(customer.spending || 0)}</td>
                <td style="text-align: center;"><span class="badge badge-tier ${tierClass}">${customer.tier}</span></td>
                <td style="text-align: center;"><span class="badge ${statusClass}">${customer.status}</span></td>
                <td style="text-align: center;">
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" data-id="${customer.id}" title="Edit">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-icon btn-delete delete" data-id="${customer.id}" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            tableBody.appendChild(tr);
        });

        updateSummary();
    }

    // Filter & Search Function
    function filterCustomers() {
        if (!searchInput || !roleFilter) return;
        const query = searchInput.value.toLowerCase().trim();
        const selectedTier = roleFilter.value;

        const filtered = customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(query) ||
                                  c.phone.includes(query) ||
                                  c.id.toLowerCase().includes(query) ||
                                  c.email.toLowerCase().includes(query);

            const matchesTier = selectedTier === '' || c.tier === selectedTier;

            return matchesSearch && matchesTier;
        });

        renderTable(filtered);
    }

    // Toast Notification helper
    function showToast(message) {
        const toast = document.getElementById('toastNotification');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Generate Next ID (e.g. CUS-005)
    function generateCustomerId() {
        if (customers.length === 0) return 'CUS-001';
        const lastId = customers[customers.length - 1].id;
        const num = parseInt(lastId.replace('CUS-', ''), 10) + 1;
        return `CUS-${String(num).padStart(3, '0')}`;
    }

    /* ==========================================
       MODAL CONTROL HANDLERS (FIXED WITH .active CLASS)
       ========================================== */
    function openModal(modal) { 
        if (modal) modal.classList.add('active'); 
    }
    
    function closeModal(modal) { 
        if (modal) modal.classList.remove('active'); 
    }

    // Event Listeners for Add Modal
    const openAddBtn = document.getElementById('openAddModalBtn') || document.querySelector('.btn-add');
    openAddBtn?.addEventListener('click', () => openModal(addModal));
    
    document.getElementById('closeAddModalBtn')?.addEventListener('click', () => closeModal(addModal));
    document.getElementById('cancelAddModalBtn')?.addEventListener('click', () => closeModal(addModal));

    // Close Modal on click outside container
    window.addEventListener('click', (e) => {
        if (e.target === addModal) closeModal(addModal);
        if (e.target === editModal) closeModal(editModal);
    });

    // Add Customer Form Submit
    addForm?.addEventListener('submit', (e) => {
        e.preventDefault();

        const newCustomer = {
            id: generateCustomerId(),
            name: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            spending: Number(document.getElementById('spending').value) || 0,
            tier: document.getElementById('membershipTier').value,
            status: document.getElementById('status').value
        };

        customers.push(newCustomer);
        saveCustomers();
        renderTable();
        closeModal(addModal);
        addForm.reset();
        showToast('Added customer successfully!');
    });

    // Event Listeners for Edit Modal
    document.getElementById('closeEditModalBtn')?.addEventListener('click', () => closeModal(editModal));
    document.getElementById('cancelEditModalBtn')?.addEventListener('click', () => closeModal(editModal));

    // Handle Table Buttons (Edit & Delete via Event Delegation)
    tableBody?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const customer = customers.find(c => c.id === id);

            if (customer) {
                if (document.getElementById('editCustomerId')) document.getElementById('editCustomerId').value = customer.id;
                if (document.getElementById('editFullName')) document.getElementById('editFullName').value = customer.name;
                if (document.getElementById('editEmail')) document.getElementById('editEmail').value = customer.email;
                if (document.getElementById('editPhone')) document.getElementById('editPhone').value = customer.phone;
                if (document.getElementById('editSpending')) document.getElementById('editSpending').value = customer.spending;
                if (document.getElementById('editMembershipTier')) document.getElementById('editMembershipTier').value = customer.tier;
                if (document.getElementById('editStatus')) document.getElementById('editStatus').value = customer.status;

                openModal(editModal);
            }
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm(`Are you sure you want to delete customer ${id}?`)) {
                customers = customers.filter(c => c.id !== id);
                saveCustomers();
                renderTable();
                showToast(`Deleted customer ${id}`);
            }
        }
    });

    // Edit Customer Form Submit
    editForm?.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('editCustomerId').value;
        const index = customers.findIndex(c => c.id === id);

        if (index !== -1) {
            customers[index] = {
                id: id,
                name: document.getElementById('editFullName').value.trim(),
                email: document.getElementById('editEmail').value.trim(),
                phone: document.getElementById('editPhone').value.trim(),
                spending: Number(document.getElementById('editSpending').value) || 0,
                tier: document.getElementById('editMembershipTier').value,
                status: document.getElementById('editStatus').value
            };

            saveCustomers();
            renderTable();
            closeModal(editModal);
            showToast('Updated customer successfully!');
        }
    });

    // Filter and Search Events
    searchInput?.addEventListener('input', filterCustomers);
    roleFilter?.addEventListener('change', filterCustomers);

    // Sidebar Mobile Toggle Logic
    menuBtn?.addEventListener('click', () => {
        if (sidebar) sidebar.classList.toggle('hidden');
        if (mainContent) mainContent.classList.toggle('expand');
    });

    // Initial Render
    renderTable();
});