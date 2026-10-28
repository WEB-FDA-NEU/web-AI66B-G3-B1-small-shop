document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    let customers = [];
    let customerTypes = [];

    const tableBody = document.getElementById('customersTableBody');
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const sortToggle = document.getElementById('customerSortToggle');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const totalCustomersEl = document.getElementById('totalCustomers');
    const totalMembersEl = document.getElementById('totalMembers');
    const membersTierLabel = document.getElementById('membersTierLabel');
    const totalSpendingEl = document.getElementById('activeCustomers');
    const addModal = document.getElementById('customerModal');
    const editModal = document.getElementById('editCustomerModal');
    const deleteModal = document.getElementById('deleteCustomerModal');
    const deleteCustomerName = document.getElementById('deleteCustomerName');
    const confirmDeleteButton = document.getElementById('confirmDeleteCustomerBtn');
    const addForm = document.getElementById('customerForm');
    const editForm = document.getElementById('editCustomerForm');
    const addTypeSelect = document.getElementById('membershipTier');
    const editTypeSelect = document.getElementById('editMembershipTier');
    const phoneInputs = [
        {
            input: document.getElementById('phone'),
            error: document.getElementById('phoneError')
        },
        {
            input: document.getElementById('editPhone'),
            error: document.getElementById('editPhoneError')
        }
    ];
    const emailInputs = [
        {
            input: document.getElementById('email'),
            error: document.getElementById('emailError')
        },
        {
            input: document.getElementById('editEmail'),
            error: document.getElementById('editEmailError')
        }
    ];
    let sortAscending = true;
    let pendingDeleteId = null;
    let deleteTrigger = null;

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
        const selectedTier = roleFilter.value;
        const members = customers.filter(customer =>
            !selectedTier || customer.type_name === selectedTier
        ).length;
        const totalSpending = customers.reduce(
            (sum, customer) => sum + (Number(customer.total_spent) || 0),
            0
        );

        totalCustomersEl.textContent = customers.length;
        totalMembersEl.textContent = members;
        membersTierLabel.textContent = selectedTier
            ? `${selectedTier} members`
            : 'All tiers';
        totalSpendingEl.textContent = formatVND(totalSpending);
    }

    function renderTable(data = customers) {
        tableBody.innerHTML = '';
        updateSummary();

        const sortedData = [...data].sort((a, b) =>
            (Number(a.customer_id) - Number(b.customer_id)) * (sortAscending ? 1 : -1)
        );

        if (sortedData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
                        No customer data found.
                    </td>
                </tr>`;
            return;
        }

        sortedData.forEach(customer => {
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
                        <a class="btn-icon" href="customers_detail.html?id=${encodeURIComponent(customer.customer_id)}" title="View customer details" aria-label="View details for ${customerLabel(customer.customer_id)}">
                            <i class="fa-solid fa-eye" aria-hidden="true"></i>
                        </a>
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

    function openDeleteConfirmation(customer, trigger) {
        pendingDeleteId = customer.customer_id;
        deleteTrigger = trigger;
        deleteCustomerName.textContent = `${customerLabel(customer.customer_id)} — ${customer.name}`;
        openModal(deleteModal);
        confirmDeleteButton.focus();
    }

    function closeDeleteConfirmation() {
        closeModal(deleteModal);
        pendingDeleteId = null;
        confirmDeleteButton.disabled = false;
        confirmDeleteButton.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i> Delete customer';
        deleteTrigger?.focus();
        deleteTrigger = null;
    }

    async function deletePendingCustomer() {
        if (pendingDeleteId === null) return;

        const id = pendingDeleteId;
        confirmDeleteButton.disabled = true;
        confirmDeleteButton.textContent = 'Deleting...';
        try {
            await request(`/customers/${id}`, { method: 'DELETE' });
            closeDeleteConfirmation();
            await loadCustomers();
            showToast(`Deleted customer ${customerLabel(id)}`);
        } catch (error) {
            confirmDeleteButton.disabled = false;
            confirmDeleteButton.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i> Delete customer';
            showToast(`Could not delete customer: ${error.message}`);
        }
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

    function validatePhone(input, errorElement) {
        const phone = input.value.trim();
        const isValid = /^0[0-9]{9}$/.test(phone);
        const message = isValid
            ? ''
            : 'Phone number must be exactly 10 digits and start with 0.';

        input.setCustomValidity(message);
        errorElement.textContent = message;
        return isValid;
    }

    function validateEmail(input, errorElement) {
        input.value = input.value.trim();
        const isValid = !input.value ||
            (!input.validity.typeMismatch && /^[^@\s]+@gmail\.com$/i.test(input.value));
        const message = isValid ? '' : 'Enter a valid email address ending with @gmail.com.';

        input.setCustomValidity(message);
        errorElement.textContent = message;
        return isValid;
    }

    phoneInputs.forEach(({ input, error }) => {
        input.addEventListener('input', () => validatePhone(input, error));
        input.addEventListener('blur', () => {
            if (input.value) validatePhone(input, error);
        });
    });

    emailInputs.forEach(({ input, error }) => {
        input.addEventListener('input', () => validateEmail(input, error));
        input.addEventListener('blur', () => validateEmail(input, error));
    });

    document.getElementById('openAddModalBtn')?.addEventListener('click', () => openModal(addModal));
    document.getElementById('closeAddModalBtn')?.addEventListener('click', () => closeModal(addModal));
    document.getElementById('cancelAddModalBtn')?.addEventListener('click', () => closeModal(addModal));
    document.getElementById('closeEditModalBtn')?.addEventListener('click', () => closeModal(editModal));
    document.getElementById('cancelEditModalBtn')?.addEventListener('click', () => closeModal(editModal));
    document.getElementById('cancelDeleteCustomerBtn')?.addEventListener('click', closeDeleteConfirmation);
    confirmDeleteButton.addEventListener('click', deletePendingCustomer);

    window.addEventListener('click', event => {
        if (event.target === addModal) closeModal(addModal);
        if (event.target === editModal) closeModal(editModal);
        if (event.target === deleteModal) closeDeleteConfirmation();
    });

    window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && deleteModal.classList.contains('active')) {
            closeDeleteConfirmation();
        }
    });

    addForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!validateEmail(emailInputs[0].input, emailInputs[0].error)) {
            emailInputs[0].input.reportValidity();
            return;
        }
        if (!validatePhone(phoneInputs[0].input, phoneInputs[0].error)) {
            phoneInputs[0].input.reportValidity();
            return;
        }
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
            validateEmail(emailInputs[1].input, emailInputs[1].error);
            document.getElementById('editPhone').value = customer.phone;
            editTypeSelect.value = String(customer.customer_type_id);
            openModal(editModal);
        }

        if (deleteButton) {
            const id = Number(deleteButton.dataset.id);
            const customer = customers.find(item => item.customer_id === id);
            if (customer) openDeleteConfirmation(customer, deleteButton);
        }
    });

    editForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!validateEmail(emailInputs[1].input, emailInputs[1].error)) {
            emailInputs[1].input.reportValidity();
            return;
        }
        if (!validatePhone(phoneInputs[1].input, phoneInputs[1].error)) {
            phoneInputs[1].input.reportValidity();
            return;
        }
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
    sortToggle.addEventListener('click', () => {
        sortAscending = !sortAscending;
        const direction = sortAscending ? 'ascending' : 'descending';
        sortToggle.setAttribute('aria-label', `Sort Customer ID ${direction}`);
        sortToggle.title = `Sort Customer ID ${direction}`;
        sortToggle.innerHTML = `
            <i class="fa-solid ${sortAscending ? 'fa-arrow-down-1-9' : 'fa-arrow-down-9-1'}" aria-hidden="true"></i>
        `;
        filterCustomers();
    });
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
