const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");
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
const allOrders = [...updatedSampleOrders, ...savedOrders];
const order = allOrders.find(order => order.id === orderId);
const orderCode = document.querySelector("#orderCode");
const customerName = document.querySelector("#customerName");
const orderStatus = document.querySelector("#orderStatus");
const orderItems = document.querySelector("#orderItems");
const pendingActions = document.querySelector("#pendingActions");
const cancelOrderBtn = document.querySelector("#cancelOrderBtn");
const confirmPaymentBtn = document.querySelector("#confirmPaymentBtn");
const statusConfirmOverlay = document.querySelector("#statusConfirmOverlay");
const statusConfirmTitle = document.querySelector("#statusConfirmTitle");
const statusConfirmMessage = document.querySelector("#statusConfirmMessage");
const statusConfirmClose = document.querySelector("#statusConfirmClose");
const statusConfirmNo = document.querySelector("#statusConfirmNo");
const statusConfirmYes = document.querySelector("#statusConfirmYes");
let pendingAction = null;
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
function updatePendingActions() {
    if (!pendingActions) {
        return;
    }
    if (order && order.status === "Pending") {
        pendingActions.classList.add("show");
    } else {
        pendingActions.classList.remove("show");
    }
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
    updatePendingActions();
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
    if (pendingActions) {
        pendingActions.classList.remove("show");
    }
}
function openStatusConfirm(action) {
    if (!order || order.status !== "Pending") {
        return;
    }
    pendingAction = action;
    if (action === "cancel") {
        statusConfirmTitle.textContent = "Cancel order";
        statusConfirmMessage.textContent = `Are you sure you want to cancel order ${order.id}?`;
    }
    if (action === "confirm") {
        statusConfirmTitle.textContent = "Confirm payment";
        statusConfirmMessage.textContent = `Are you sure you want to confirm payment for order ${order.id}?`;
    }
    statusConfirmOverlay.classList.add("show");
}
function closeStatusConfirm() {
    pendingAction = null;
    statusConfirmOverlay.classList.remove("show");
}
function updateOrderStatus(newStatus) {
    if (!order || order.status !== "Pending") {
        closeStatusConfirm();
        return;
    }
    const savedOrders = JSON.parse(localStorage.getItem("yumsOrders") || "[]");
    const savedOrderIndex = savedOrders.findIndex(item => item.id === order.id);
    if (savedOrderIndex !== -1) {
        savedOrders[savedOrderIndex].status = newStatus;
        localStorage.setItem("yumsOrders", JSON.stringify(savedOrders));
    } else {
        const currentOverrides = JSON.parse(localStorage.getItem("yumsOrderStatusOverrides") || "{}");
        currentOverrides[order.id] = newStatus;
        localStorage.setItem("yumsOrderStatusOverrides", JSON.stringify(currentOverrides));
    }
    order.status = newStatus;
    renderOrder(order);
    closeStatusConfirm();
}
if (cancelOrderBtn) {
    cancelOrderBtn.addEventListener("click", () => {
        if (order && order.status === "Pending") {
            openStatusConfirm("cancel");
        }
    });
}
if (confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener("click", () => {
        if (order && order.status === "Pending") {
            openStatusConfirm("confirm");
        }
    });
}
if (statusConfirmClose) {
    statusConfirmClose.addEventListener("click", closeStatusConfirm);
}
if (statusConfirmNo) {
    statusConfirmNo.addEventListener("click", closeStatusConfirm);
}
if (statusConfirmYes) {
    statusConfirmYes.addEventListener("click", () => {
        if (pendingAction === "cancel") {
            updateOrderStatus("Cancelled");
        }
        if (pendingAction === "confirm") {
            updateOrderStatus("Success");
        }
    });
}
if (statusConfirmOverlay) {
    statusConfirmOverlay.addEventListener("click", event => {
        if (event.target === statusConfirmOverlay) {
            closeStatusConfirm();
        }
    });
}
if (order) {
    renderOrder(order);
} else {
    showOrderNotFound();
}