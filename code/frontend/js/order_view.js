const API_BASE_URL = "http://127.0.0.1:8000/api";

const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

const orderCode = document.querySelector("#orderCode");
const customerName = document.querySelector("#customerName");
const orderStatus = document.querySelector("#orderStatus");
const orderItems = document.querySelector("#orderItems");
const pendingActions = document.querySelector("#pendingActions");
const confirmDeliveryBtn = document.querySelector("#confirmDeliveryBtn");
const statusConfirmOverlay = document.querySelector("#statusConfirmOverlay");
const statusConfirmClose = document.querySelector("#statusConfirmClose");
const statusConfirmNo = document.querySelector("#statusConfirmNo");
const statusConfirmYes = document.querySelector("#statusConfirmYes");

//must be VND !!!!
function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString("vi-VN") + " VND";
}


function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[char];
    });
}


function getStatusLabel(status) {
    const labels = {
        delivered: "Delivered",
        not_deliver: "Not delivered"
    };

    return labels[status] || status || "Unknown";
}


function getStatusClass(status) {
    if (status === "delivered") {
        return "success";
    }

    if (status === "not_deliver") {
        return "pending";
    }

    return "";
}

//fetch from REAL data
async function loadOrderDetails() {
    if (!orderId) {
        showOrderNotFound("Missing order ID.");
        return;
    }

    orderItems.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 30px;">
                Loading order details...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`
        );

        if (response.status === 404) {
            showOrderNotFound();
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const order = await response.json();

        renderOrder(order);

    } catch (error) {
        console.error("Failed to load order details:", error);

        orderItems.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px;">
                    Unable to load order details. Please try again.
                </td>
            </tr>
        `;
    }
}

//Render in4mation
function renderOrder(order) {
    orderCode.textContent = order.order_id;
    customerName.textContent = order.customer_name || "Guest";

    orderStatus.textContent = getStatusLabel(order.deliver_status);
    orderStatus.className =
        `status-badge ${getStatusClass(order.deliver_status)}`;

    orderItems.innerHTML = "";

    const items = order.items || [];

    if (items.length === 0) {
        orderItems.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px;">
                    No items found in this order.
                </td>
            </tr>
        `;
    } else {
        items.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td class="dish-id">
                    ${escapeHtml(item.product_id)}
                </td>
                <td>${escapeHtml(item.name)}</td>
                <td>${formatCurrency(item.unit_price)}</td>
                <td>${Number(item.quantity)}</td>
                <td>${formatCurrency(item.subtotal)}</td>
            `;

            orderItems.appendChild(row);
        });

        //discount line (but only when discount exists)
        if (Number(order.discount_amount) > 0) {
            const discountRow = document.createElement("tr");

            discountRow.innerHTML = `
                <td colspan="4">Discount</td>
                <td>-${formatCurrency(order.discount_amount)}</td>
            `;

            orderItems.appendChild(discountRow);
        }

        //total bill line
        const totalRow = document.createElement("tr");
        totalRow.className = "total-row";

        totalRow.innerHTML = `
            <td colspan="4">Total</td>
            <td>${formatCurrency(order.total_amount)}</td>
        `;

        orderItems.appendChild(totalRow);
    }

    if (confirmDeliveryBtn) {
        confirmDeliveryBtn.hidden = order.deliver_status !== "not_deliver";
    }
}

//handle missing order error
function showOrderNotFound(message = "Order not found.") {
    orderCode.textContent = "Not found";
    customerName.textContent = "Unknown customer";

    orderStatus.textContent = "Unknown";
    orderStatus.className = "status-badge";

    orderItems.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 30px;">
                ${escapeHtml(message)}
            </td>
        </tr>
    `;

    if (pendingActions) {
        pendingActions.classList.remove("show");
    }
}

//delivery confirmation mini pop
// Open confirmation modal
function openDeliveryModal() {
    if (statusConfirmOverlay) {
        statusConfirmOverlay.classList.add("show");
    }
}
//close it
function closeDeliveryModal() {
    if (statusConfirmOverlay) {
        statusConfirmOverlay.classList.remove("show");
    }
}

//yes button to cf delivery status
async function confirmOrderDelivery() {
    if (!orderId || !statusConfirmYes) return;

    //avoid repeating clicks whil handling
    statusConfirmYes.disabled = true;
    statusConfirmYes.textContent = "Processing...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/deliver`,
            {
                method: "PATCH"
            }
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        const updatedOrder = await response.json();
        if (updatedOrder.deliver_status !== "delivered") {
            throw new Error("The delivery status was not updated successfully.");
        }

        //close poppup
        closeDeliveryModal();
        //reload od detaiils in backend
        await loadOrderDetails();

    } catch (error) {
        console.error("Failed to confirm delivery:", error);
        alert(`Unable to confirm delivery: ${error.message}`);

    } finally {
        statusConfirmYes.disabled = false;
        statusConfirmYes.textContent = "Yes";
    }
}

//assign events for buttons
//open popup
if (confirmDeliveryBtn) {
    confirmDeliveryBtn.addEventListener("click", openDeliveryModal);
}
//approve when clicking Yes
if (statusConfirmYes) {
    statusConfirmYes.addEventListener("click", confirmOrderDelivery);
}
//close it when clicking No
if (statusConfirmNo) {
    statusConfirmNo.addEventListener("click", closeDeliveryModal);
}
//or when clicking X
if (statusConfirmClose) {
    statusConfirmClose.addEventListener("click", closeDeliveryModal);
}
//or just outside the popup area
if (statusConfirmOverlay) {
    statusConfirmOverlay.addEventListener("click", (event) => {
        if (event.target === statusConfirmOverlay) {
            closeDeliveryModal();
        }
    });
}

loadOrderDetails();