document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    const customerId = Number(new URLSearchParams(window.location.search).get('id'));
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
        if (!value) return '—';
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return '—';
        return `${match[3]}/${match[2]}/${match[1]}`;
    }

    function customerLabel(id) {
        return `CUS-${String(id).padStart(3, '0')}`;
    }

    function showError(message) {
        document.getElementById('customerName').textContent = message;
        document.getElementById('customerTier').textContent = 'Unavailable';
        recentOrdersBody.innerHTML = `
            <tr><td colspan="6" class="table-message">${escapeHTML(message)}</td></tr>
        `;
    }

    function renderCustomer(customer) {
        const tier = customer.type_name || 'Unknown';
        const tierClass = tier.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const initials = customer.name
            .trim()
            .split(/\s+/)
            .slice(-2)
            .map(part => part[0])
            .join('')
            .toUpperCase();

        document.getElementById('customerAvatar').textContent = initials || 'KH';
        document.getElementById('customerName').textContent = customer.name;
        const tierBadge = document.getElementById('customerTier');
        tierBadge.textContent = `${tier} Member`;
        tierBadge.className = `membership-badge ${tierClass}`;
        document.getElementById('customerId').textContent = customerLabel(customer.customer_id);
        document.getElementById('customerEmail').textContent = customer.email || '—';
        document.getElementById('customerPhone').textContent = customer.phone || '—';
        document.getElementById('customerCreatedAt').textContent = formatDate(customer.created_at);
        document.getElementById('customerDiscount').textContent =
            `${Number(customer.discount_percent) || 0}%`;
    }

    function renderStats(customer, stats) {
        const completedOrders = Number(stats.completed_orders) || 0;
        const completedSpending = Number(stats.completed_spending) || 0;

        document.getElementById('totalOrders').textContent =
            Number(stats.total_orders) || 0;
        document.getElementById('totalSpending').textContent =
            formatVND(customer.total_spent);
        document.getElementById('averageOrder').textContent = formatVND(
            completedOrders ? completedSpending / completedOrders : 0
        );
        document.getElementById('totalDiscount').textContent =
            formatVND(stats.total_discount);
    }

    function renderOrders(orders) {
        if (orders.length === 0) {
            recentOrdersBody.innerHTML = `
                <tr><td colspan="6" class="table-message">This customer has no orders yet.</td></tr>
            `;
            return;
        }

        recentOrdersBody.innerHTML = orders.map(order => {
            const isDelivered = order.deliver_status === 'delivered';
            const status = isDelivered ? 'Delivered' : 'Not delivered';
            const statusClass = isDelivered ? 'delivered' : 'pending';
            return `
                <tr>
                    <td>ORD-${String(order.order_id).padStart(3, '0')}</td>
                    <td>${formatDate(order.created_at)}</td>
                    <td>${escapeHTML(order.items || '—')}</td>
                    <td>${formatVND(order.total_amount)}</td>
                    <td>${formatVND(order.discount_amount)}</td>
                    <td><span class="order-status ${statusClass}">${status}</span></td>
                </tr>
            `;
        }).join('');
    }

    async function loadCustomerDetails() {
        if (!Number.isInteger(customerId) || customerId <= 0) {
            showError('Invalid customer ID.');
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/customers/${customerId}/details`
            );
            const result = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(result?.detail || `Request failed (${response.status})`);
            }

            renderCustomer(result.customer);
            renderStats(result.customer, result.stats);
            renderOrders(result.recent_orders);
        } catch (error) {
            showError(`Unable to load customer details: ${error.message}`);
        }
    }

    loadCustomerDetails();
});