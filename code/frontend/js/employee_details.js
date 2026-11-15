document.addEventListener('DOMContentLoaded', () => {
    const employeeId = Number(new URLSearchParams(window.location.search).get('id'));
    const recentOrdersBody = document.getElementById('recentOrdersBody');

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

    function formatDate(value) {
        const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
    }

    function employeeLabel(id) {
        return `NV-${String(id).padStart(3, '0')}`;
    }

    function showError(message) {
        document.getElementById('employeeName').textContent = message;
        const status = document.getElementById('employeeStatus');
        status.textContent = 'Unavailable';
        status.className = 'membership-badge employee-status inactive';
        recentOrdersBody.innerHTML = `
            <tr><td colspan="6" class="table-message">${escapeHTML(message)}</td></tr>
        `;
    }

    function renderEmployee(employee) {
        const initials = String(employee.name || '')
            .trim()
            .split(/\s+/)
            .slice(-2)
            .map(part => part[0])
            .join('')
            .toUpperCase();
        document.getElementById('employeeAvatar').textContent = initials || 'NV';
        document.getElementById('employeeName').textContent = employee.name || 'Unnamed employee';
        document.getElementById('employeeId').textContent = employeeLabel(employee.employee_id);
        document.getElementById('employeeUsername').textContent = employee.username || '—';
        document.getElementById('employeePhone').textContent = employee.phone || '—';
        document.getElementById('employeeRole').textContent = employee.role || '—';
        document.getElementById('employeeStartDate').textContent = formatDate(employee.created_at);

        const status = document.getElementById('employeeStatus');
        status.textContent = employee.status || 'Unknown';
        status.className = `membership-badge employee-status ${
            String(employee.status || '').toLowerCase().replace(/[^a-z0-9_-]/g, '')
        }`;
    }

    function renderStats(stats) {
        document.getElementById('totalOrders').textContent = Number(stats.total_orders) || 0;
        document.getElementById('totalSales').textContent = formatVND(stats.total_sales);
        document.getElementById('daysWorked').textContent = Number(stats.days_worked) || 0;
    }

    function renderOrders(orders) {
        if (orders.length === 0) {
            recentOrdersBody.innerHTML = `
                <tr><td colspan="6" class="table-message">This employee has not served any orders yet.</td></tr>
            `;
            return;
        }

        recentOrdersBody.innerHTML = orders.map(order => {
            const delivered = order.deliver_status === 'delivered';
            const status = delivered ? 'Delivered' : 'Not delivered';
            const statusClass = delivered ? 'delivered' : 'pending';
            return `
                <tr>
                    <td data-label="Order ID">ORD-${String(order.order_id).padStart(3, '0')}</td>
                    <td data-label="Date">${formatDate(order.created_at)}</td>
                    <td data-label="Customer">${escapeHTML(order.customer_name || 'Walk-in')}</td>
                    <td data-label="Items">${escapeHTML(order.items || '—')}</td>
                    <td data-label="Total">${formatVND(order.total_amount)}</td>
                    <td data-label="Status"><span class="order-status ${statusClass}">${status}</span></td>
                </tr>
            `;
        }).join('');
    }

    async function loadEmployeeDetails() {
        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            showError('Invalid employee ID.');
            return;
        }

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/employees/${encodeURIComponent(employeeId)}/details`
            );
            const result = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(result?.detail || `Request failed (${response.status})`);
            }

            renderEmployee(result.employee);
            renderStats({ ...result.stats, days_worked: result.employee.days_worked });
            renderOrders(result.recent_orders);
        } catch (error) {
            showError(`Unable to load employee details: ${error.message}`);
        }
    }

    loadEmployeeDetails();
});