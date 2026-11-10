const API_BASE_URL = "https://small-shop-tailscale.onrender.com";

let orders = [];
let renderVersion = 0;
let searchVersion = 0;

const ordersTableBody = document.querySelector(".orders-table tbody");
const searchInput = document.querySelector(".order-search input");
const statusFilter = document.querySelector("#statusFilter");


//HELPER FUNCTS AND THINGS
function formatCurrency(amount) {
    return amount.toLocaleString("vi-VN") + "VND";
}

function formatDateTime(dateTime) {
    if (!dateTime) return "Unknown";

    const date = new Date(dateTime);

    if (isNaN(date.getTime())) return "Unknown";

    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

function getStatusLabel(status) {
    const statusLabels = {
        delivered: "Delivered",
        not_deliver: "Not delivered"
    };
    return statusLabels[status] || status || "Unknown";
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

//to avoid shoving API data directly into html without escaping
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


// ORDER FUNCTIONS
async function loadOrderDetails(orderId) {
    const response = await fetch(
        `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`
    );
    if (!response.ok) {
        throw new Error(`Failed to load order ${orderId}`);
    }
    return await response.json();
}


// RENDER ORDER
async function renderOrders(data) {
    const currentRenderVersion = ++renderVersion;
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

    ordersTableBody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 30px;">
                Loading order details...
            </td>
        </tr>
    `;

    const detailedOrders = await Promise.all(
        data.map(async order => {
            try {
                return await loadOrderDetails(order.order_id);
            } catch (error) {
                console.error(
                    `Could not load order ${order.order_id}:`,
                    error
                );
                return { ...order, items: [] };
            }
        })
    );

    if (currentRenderVersion !== renderVersion) return;

    ordersTableBody.innerHTML = "";

    detailedOrders.forEach(order => {
        const row = document.createElement("tr");
        row.className = "clickable-order";

        const items = order.items || [];

        const dishNames = items.length
            ? items.map(item => escapeHtml(item.name)).join(", ")
            : "—";

        const totalQuantity = items.reduce(
            (total, item) => total + Number(item.quantity || 0),
            0
        );

        row.innerHTML = `
            <td class="order-id">${escapeHtml(order.order_id)}</td>
            <td class="order-items">${dishNames}</td>
            <td>${totalQuantity}</td>
            <td>${formatCurrency(order.total_amount)}</td>
            <td>${escapeHtml(order.customer_name || "Guest")}</td>
            <td>${formatDateTime(order.created_at)}</td>
            <td>
                <span class="status-badge ${getStatusClass(order.deliver_status)}">
                    ${escapeHtml(getStatusLabel(order.deliver_status))}
                </span>
            </td>
        `;

        row.addEventListener("click", () => {
            window.location.href =
                `order_view.html?id=${encodeURIComponent(order.order_id)}`;
        });

        ordersTableBody.appendChild(row);
    });
}


// SEARCH AND FILTER
async function filterOrdersByDishName(filteredOrders, searchTerm) {
    const currentSearchVersion = ++searchVersion;
    if (!searchTerm) {
        renderOrders(filteredOrders);
        return;
    }
    const ordersWithDetails = await Promise.all(
        filteredOrders.map(async order => {
            try {
                return await loadOrderDetails(order.order_id);
            } catch (error) {
                console.error(
                    `Could not load order ${order.order_id}:`,
                    error
                );
                return { ...order, items: [] };
            }
        })
    );
    //to forget old searching result if user enters new searching keywords
    if (currentSearchVersion !== searchVersion) return;
    const matchedOrders = ordersWithDetails.filter(order =>
        (order.items || []).some(item =>
            String(item.name || "")
                .toLowerCase()
                .includes(searchTerm)
        )
    );
    renderOrders(matchedOrders);
}

function filterData() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value;

    const filteredOrders = orders.filter(order => {
        const matchesStatus =
            selectedStatus === "" ||
            order.deliver_status === selectedStatus;

        return matchesStatus;
    });

    //search by dish in each order
    filterOrdersByDishName(filteredOrders, searchTerm);
}


// LOAD ORDERS
async function loadOrders() {
    ordersTableBody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 30px;">
                Loading orders...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error("Unexpected orders response format");
        }

        orders = data;
        filterData();
    } catch (error) {
        console.error("Failed to load orders:", error);

        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px;">
                    Unable to load orders. Please try again.
                </td>
            </tr>
        `;
    }
}



searchInput.addEventListener("input", filterData);
statusFilter.addEventListener("change", filterData);

loadOrders();