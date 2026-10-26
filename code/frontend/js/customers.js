document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    let customers = [];
    let customerTypes = [];

    const tableBody = document.getElementById('customersTableBody');
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const totalCustomersEl = document.getElementById('totalCustomers');
    const totalMembersEl = document.getElementById('totalMembers');
    const totalSpendingEl = document.getElementById('activeCustomers');
    const addModal = document.getElementById('customerModal');
    const editModal = document.getElementById('editCustomerModal');
    const addForm = document.getElementById('customerForm');
    const editForm = document.getElementById('editCustomerForm');
    const addTypeSelect = document.getElementById('membershipTier');
    const editTypeSelect = document.getElementById('editMembershipTier');

    function customerLabel(id) {
        return `CUS-${String(id).padStart(3, '0')}`;
    }

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    function formatVND(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(Number(amount) || 0);
    }

    function formatDate(date) {
        if (!date) return '—';
        const parsedDate = new Date(date);
        return Number.isNaN(parsedDate.getTime())
            ? '—'
            : new Intl.DateTimeFormat('vi-VN').format(parsedDate);
    }

    function updateSummary() {
        const members = customers.filter(customer =>
            ['Gold', 'Silver'].includes(customer.type_name)
        ).length;
        const totalSpending = customers.reduce(
            (sum, customer) => sum + (Number(customer.total_spent) || 0),
            0
        );

        totalCustomersEl.textContent = customers.length;
        totalMembersEl.textContent = members;
        totalSpendingEl.textContent = formatVND(totalSpending);
    }

    function renderTable(data = customers) {
        tableBody.innerHTML = '';
        updateSummary();

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
            const row = document.createElement('tr');
            const tier = customer.type_name || 'Unknown';
            const tierClass = escapeHTML(tier.toLowerCase());
            row.innerHTML = `
                <td><strong class="cus-id">${customerLabel(customer.customer_id)}</strong></td>
                <td>${escapeHTML(customer.name)}</td>
                <td>${escapeHTML(customer.phone)}</td>
                <td>${escapeHTML(customer.email || '—')}</td>
                <td style="text-align: right;">${formatVND(customer.total_spent)}</td>
                <td style="text-align: center;"><span class="badge badge-tier ${tierClass}">${escapeHTML(tier)}</span></td>
                <td style="text-align: center;">${formatDate(customer.created_at)}</td>
                <td style="text-align: center;">
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" data-id="${customer.customer_id}" title="Edit">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-icon btn-delete delete" data-id="${customer.customer_id}" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>`;
            tableBody.appendChild(row);
        });
    }

    function filterCustomers() {
        const query = searchInput.value.toLowerCase().trim();
        const selectedTier = roleFilter.value;
        const filtered = customers.filter(customer => {
            const searchable = [
                customer.name,
                customer.phone,
                customer.email,
                customerLabel(customer.customer_id),
                customer.customer_id
            ].join(' ').toLowerCase();
            return searchable.includes(query) &&
                (!selectedTier || customer.type_name === selectedTier);
        });
        renderTable(filtered);
    }

    function showToast(message) {
        const toast = document.getElementById('toastNotification');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    async function request(path, options = {}) {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...options.headers
            }
        });
        if (!response.ok) {
            let message = `Request failed (${response.status})`;
            try {
                const body = await response.json();
                message = body.detail || message;
            } catch {
                // Keep the HTTP status message when the response is not JSON.
            }
            throw new Error(message);
        }
        return response.status === 204 ? null : response.json();
    }

    async function loadCustomers() {
        try {
            customers = await request('/customers');
            renderTable();
        } catch (error) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: #b42318; padding: 24px;">
                        Unable to load customers: ${escapeHTML(error.message)}
                    </td>
                </tr>`;
            showToast(`Could not load customers: ${error.message}`);
        }
    }

    async function loadCustomerTypes() {
        customerTypes = await request('/customer-types');
        [addTypeSelect, editTypeSelect].forEach(select => {
            select.innerHTML = customerTypes.map(type =>
                `<option value="${type.customer_type_id}">${escapeHTML(type.type_name)}</option>`
            ).join('');
        });
    }

    function openModal(modal) {
        modal?.classList.add('active');
    }

    function closeModal(modal) {
        modal?.classList.remove('active');
    }

    function customerPayload(form, typeSelect) {
        const formData = new FormData(form);
        return {
            name: formData.get('name').trim(),
            phone: formData.get('phone').trim(),
            email: formData.get('email').trim() || null,
            customer_type_id: Number(typeSelect.value)
        };
    }

    document.getElementById('openAddModalBtn')?.addEventListener('click', () => openModal(addModal));
    document.getElementById('closeAddModalBtn')?.addEventListener('click', () => closeModal(addModal));
    document.getElementById('cancelAddModalBtn')?.addEventListener('click', () => closeModal(addModal));
    document.getElementById('closeEditModalBtn')?.addEventListener('click', () => closeModal(editModal));
    document.getElementById('cancelEditModalBtn')?.addEventListener('click', () => closeModal(editModal));

    window.addEventListener('click', event => {
        if (event.target === addModal) closeModal(addModal);
        if (event.target === editModal) closeModal(editModal);
    });

    addForm.addEventListener('submit', async event => {
        event.preventDefault();
        try {
            await request('/customers', {
                method: 'POST',
                body: JSON.stringify(customerPayload(addForm, addTypeSelect))
            });
            closeModal(addModal);
            addForm.reset();
            await loadCustomers();
            showToast('Added customer successfully!');
        } catch (error) {
            showToast(`Could not add customer: ${error.message}`);
        }
    });

    tableBody.addEventListener('click', async event => {
        const editButton = event.target.closest('.btn-edit');
        const deleteButton = event.target.closest('.btn-delete');

        if (editButton) {
            const customer = customers.find(item =>
                item.customer_id === Number(editButton.dataset.id)
            );
            if (!customer) return;
            document.getElementById('editCustomerId').value = customer.customer_id;
            document.getElementById('editFullName').value = customer.name;
            document.getElementById('editEmail').value = customer.email || '';
            document.getElementById('editPhone').value = customer.phone;
            editTypeSelect.value = String(customer.customer_type_id);
            openModal(editModal);
        }

        if (deleteButton) {
            const id = Number(deleteButton.dataset.id);
            if (!confirm(`Are you sure you want to delete customer ${customerLabel(id)}?`)) return;
            try {
                await request(`/customers/${id}`, { method: 'DELETE' });
                await loadCustomers();
                showToast(`Deleted customer ${customerLabel(id)}`);
            } catch (error) {
                showToast(`Could not delete customer: ${error.message}`);
            }
        }
    });

    editForm.addEventListener('submit', async event => {
        event.preventDefault();
        const id = Number(document.getElementById('editCustomerId').value);
        try {
            await request(`/customers/${id}`, {
                method: 'PUT',
                body: JSON.stringify(customerPayload(editForm, editTypeSelect))
            });
            closeModal(editModal);
            await loadCustomers();
            showToast('Updated customer successfully!');
        } catch (error) {
            showToast(`Could not update customer: ${error.message}`);
        }
    });

    searchInput.addEventListener('input', filterCustomers);
    roleFilter.addEventListener('change', filterCustomers);
    menuBtn?.addEventListener('click', () => {
        sidebar?.classList.toggle('hidden');
        mainContent?.classList.toggle('expand');
    });

    (async () => {
        try {
            await loadCustomerTypes();
        } catch (error) {
            showToast(`Could not load membership types: ${error.message}`);
        }
        await loadCustomers();
    })();
});
