const API_BASE_URL = "http://127.0.0.1:8000";

const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

const orderCode = document.querySelector("#orderCode");
const createdBy = document.querySelector("#createdBy");
const createdAt = document.querySelector("#createdAt");
const customerName = document.querySelector("#customerName");
const orderStatus = document.querySelector("#orderStatus");
const orderItems = document.querySelector("#orderItems");

const pendingActions = document.querySelector("#pendingActions");
const confirmDeliveryBtn = document.querySelector("#confirmDeliveryBtn");

const statusConfirmOverlay = document.querySelector("#statusConfirmOverlay");
const statusConfirmClose = document.querySelector("#statusConfirmClose");
const statusConfirmNo = document.querySelector("#statusConfirmNo");
const statusConfirmYes = document.querySelector("#statusConfirmYes");


// HELPER FUNCTIONS
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

function showToast(message, isError = false) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

//ORDER NOTE
//save note thru backend api
async function saveOrderNote(input, button, display, editArea) {
    if (!orderId) return;

    const newNote = input.value.trim();

    button.disabled = true;

    try {
        const response = await fetch(
            `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/note`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    note: newNote || null
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const updatedOrder = await response.json();
        const savedNote = updatedOrder.note ?? newNote;

        display.textContent = savedNote;
        input.value = savedNote;

        editArea.hidden = true;
        display.hidden = false;

    } catch (error) {
        console.error("Failed to update order note:", error);
        showToast(`Unable to update Note: ${error.message}`, true);
    } finally {
        button.disabled = false;
    }
}

function renderOrderNote(order) {
    const noteRow = document.createElement("tr");
    noteRow.className = "order-note-row";

    const noteCell = document.createElement("td");
    noteCell.colSpan = 5;

    const noteContainer = document.createElement("div");
    noteContainer.className = "order-note";

    const noteLabel = document.createElement("span");
    noteLabel.className = "order-note-label";
    noteLabel.textContent = "Note:";

    const noteDisplay = document.createElement("div");
    noteDisplay.className = "order-note-display";
    noteDisplay.textContent = order.note || "";

    const noteEdit = document.createElement("div");
    noteEdit.className = "order-note-edit";
    noteEdit.hidden = true;

    const noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.className = "order-note-input";
    noteInput.maxLength = 500;
    noteInput.placeholder = "Enter note...";
    noteInput.value = order.note || "";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "save-note-btn";
    saveButton.textContent = "✓";
    saveButton.title = "Save note";
    saveButton.setAttribute("aria-label", "Save note");

    noteEdit.append(noteInput, saveButton);
    noteContainer.append(noteLabel, noteDisplay, noteEdit);
    noteCell.appendChild(noteContainer);
    noteRow.appendChild(noteCell);

    // Only not_deliver orders can edit Note
    if (order.deliver_status === "not_deliver") {
        noteDisplay.classList.add("editable");

        // Open editor
        noteDisplay.addEventListener("click", () => {
            noteDisplay.hidden = true;
            noteEdit.hidden = false;
            noteInput.value = order.note || "";
            noteInput.focus();
        });

        // Close editor without saving
        function cancelNoteEdit() {
            noteInput.value = order.note || "";
            noteEdit.hidden = true;
            noteDisplay.hidden = false;
        }

        // Click outside Note row: cancel editing
        document.addEventListener("click", (event) => {
            if (
                !noteEdit.hidden &&
                !noteRow.contains(event.target)
            ) {
                cancelNoteEdit();
            }
        });

        // Save Note
        saveButton.addEventListener("click", () => {
            saveOrderNote(noteInput, saveButton, noteDisplay, noteEdit);
        });

        // Enter key: save Note
        noteInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                saveButton.click();
            }

            // Escape key: cancel editing
            if (event.key === "Escape") {
                cancelNoteEdit();
            }
        });
    }

    return noteRow;
}


//ORDER DETAIL
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

function renderOrder(order) {
    orderCode.textContent = order.order_id;
    createdBy.textContent = order.employee_name || "Unknown";
    createdAt.textContent = order.created_at
        ? new Date(order.created_at).toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        })
        : "Unknown";
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
        orderItems.appendChild(renderOrderNote(order));
    } else {
        items.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td class="dish-id" data-label="Dish code">
                    ${escapeHtml(item.product_id)}
                </td>
                <td data-label="Dish name">${escapeHtml(item.name)}</td>
                <td data-label="Unit price">${formatCurrency(item.unit_price)}</td>
                <td data-label="Quantity">${Number(item.quantity)}</td>
                <td data-label="Amount">${formatCurrency(item.subtotal)}</td>
            `;

            orderItems.appendChild(row);
        });
        // Note row: after dishes, before Discount and Total
        orderItems.appendChild(renderOrderNote(order));

        //discount line (but only when discount exists)
        if (Number(order.discount_amount) > 0) {
            const discountRow = document.createElement("tr");
            discountRow.className = "discount-row";

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

async function loadOrderDetails() {
    if (!orderId) {
        showOrderNotFound("Missing order ID.");
        return;
    }

    orderItems.innerHTML = `
        <tr>
            <td colspan="5">
                <div class="loading-state">
                    <span class="loading-spinner"></span>
                    <span>Loading order details...</span>
                </div>
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





// DELIVERY CONFIRMATION
function openDeliveryModal() {
    if (statusConfirmOverlay) {
        statusConfirmOverlay.classList.add("show");
    }
}

function closeDeliveryModal() {
    if (statusConfirmOverlay) {
        statusConfirmOverlay.classList.remove("show");
    }
}

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
        showToast(`Unable to confirm delivery: ${error.message}`, true);
    } finally {
        statusConfirmYes.disabled = false;
        statusConfirmYes.textContent = "Yes";
    }
}

// event listeners
if (confirmDeliveryBtn) {
    confirmDeliveryBtn.addEventListener("click", openDeliveryModal);
}

if (statusConfirmYes) {
    statusConfirmYes.addEventListener("click", confirmOrderDelivery);
}

if (statusConfirmNo) {
    statusConfirmNo.addEventListener("click", closeDeliveryModal);
}

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

//force sidebar to hide again
(() => {
    const viewSidebar = document.getElementById("sidebar");
    const viewMenuBtn = document.getElementById("menuBtn");
    if (!viewSidebar || !viewMenuBtn || !window.matchMedia) return;
    const viewBreakpoint = window.matchMedia("(max-width: 64rem)");
    function syncViewSidebar() {
        if (viewBreakpoint.matches) {
            viewSidebar.classList.add("hidden");
        } else {
            viewSidebar.classList.remove("hidden");
        }
    }
    syncViewSidebar();
    if (viewBreakpoint.addEventListener) {
        viewBreakpoint.addEventListener("change", syncViewSidebar);
    } else {
        viewBreakpoint.addListener(syncViewSidebar);
    }
})();


loadOrderDetails();