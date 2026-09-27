const savedOrders = JSON.parse(localStorage.getItem("yumsOrders") || "[]");
const statusOverrides = JSON.parse(localStorage.getItem("yumsOrderStatusOverrides") || "{}");
const updatedSampleOrders = ordersData.map(order => {
    if (statusOverrides[order.id]) {
        return {
            ...order,
            status: statusOverrides[order.id]
        };
    }
    return order;
});
let orders = [...updatedSampleOrders, ...savedOrders];
const ordersTableBody = document.querySelector(".orders-table tbody");
const searchInput = document.querySelector(".order-search input");
const statusFilter = document.querySelector("#statusFilter");
function formatCurrency(amount) {
    return amount.toLocaleString("vi-VN") + "VND";
}
function getDishNames(order) {
    return order.items.map(item => item.name).join(", ");
}
function getTotalQuantity(order) {
    return order.items.reduce((total, item) => total + item.quantity, 0);
}
function getOrderTotal(order) {
    return order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
}
function getStatusClass(status) {
    if (status === "Success") {
        return "success";
    }
    if (status === "Pending") {
        return "pending";
    }
    if (status === "Cancelled") {
        return "cancelled";
    }
    return "";
}
function renderOrders(data) {
    ordersTableBody.innerHTML = "";
    if (data.length === 0) {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px;">
                    No matching orders found.
                </td>
            </tr>
        `;
        return;
    }
    data.forEach(order => {
        const row = document.createElement("tr");
        row.className = "clickable-order";
        row.addEventListener("click", () => {
            window.location.href = `order_view.html?id=${order.id}`;
        });
        row.innerHTML = `
            <td class="order-id">${order.id}</td>
            <td class="order-items">${getDishNames(order)}</td>
            <td>${getTotalQuantity(order)}</td>
            <td>${formatCurrency(getOrderTotal(order))}</td>
            <td>${order.customer}</td>
            <td>
                <span class="status-badge ${getStatusClass(order.status)}">
                    ${order.status}
                </span>
            </td>
        `;
        ordersTableBody.appendChild(row);
    });
}
function filterData() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value;
    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.customer.toLowerCase().includes(searchTerm) ||
            order.id.toLowerCase().includes(searchTerm) ||
            getDishNames(order).toLowerCase().includes(searchTerm);
        const matchesStatus =
            selectedStatus === "" ||
            order.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });
    renderOrders(filteredOrders);
}
searchInput.addEventListener("input", filterData);
statusFilter.addEventListener("change", filterData);
renderOrders(orders);