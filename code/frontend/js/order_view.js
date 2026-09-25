const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");
const order = ordersData.find(item => item.id === orderId);
const orderCode = document.querySelector("#orderCode");
const customerName = document.querySelector("#customerName");
const orderStatus = document.querySelector("#orderStatus");
const orderItems = document.querySelector("#orderItems");
function formatCurrency(amount) {
    return amount.toLocaleString("vi-VN") + "VND";
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
function getOrderTotal(order) {
    return order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
}
function renderOrder(order) {
    orderCode.textContent = order.id;
    customerName.textContent = order.customer;
    orderStatus.textContent = order.status;
    orderStatus.className = `status-badge ${getStatusClass(order.status)}`;
    orderItems.innerHTML = "";
    order.items.forEach(item => {
        const amount = item.price * item.quantity;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="dish-id">${item.id}</td>
            <td>${item.name}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(amount)}</td>
        `;
        orderItems.appendChild(row);
    });
    const totalRow = document.createElement("tr");
    totalRow.className = "total-row";
    totalRow.innerHTML = `
        <td colspan="4">Total</td>
        <td>${formatCurrency(getOrderTotal(order))}</td>
    `;
    orderItems.appendChild(totalRow);
}
function showOrderNotFound() {
    orderCode.textContent = "Not found";
    customerName.textContent = "Unknown customer";
    orderStatus.textContent = "Unknown";
    orderStatus.className = "status-badge";
    orderItems.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 30px;">
                Order not found.
            </td>
        </tr>
    `;
}
if (order) {
    renderOrder(order);
} else {
    showOrderNotFound();
}