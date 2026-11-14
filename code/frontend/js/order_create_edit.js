const API_BASE_URL = "http://127.0.0.1:8000";

const dishGrid = document.querySelector("#dishGrid");
const billItems = document.querySelector("#billItems");
const billTotal = document.querySelector("#billTotal");
const dishSearch = document.querySelector("#dishSearch");
const sumBtn = document.querySelector("#sumBtn");
const orderAuthenticatedUser = JSON.parse(sessionStorage.getItem("authenticatedUser") || "null");
const orderConfirmOverlay = document.querySelector("#orderConfirmOverlay");
const customerPhoneInput = document.querySelector("#customerPhoneInput");
const customerSuggestions = document.querySelector("#customerSuggestions");
const orderNoteInput = document.querySelector("#orderNoteInput");
const confirmItems = document.querySelector("#confirmItems");
const confirmTotal = document.querySelector("#confirmTotal");
const confirmClose = document.querySelector("#confirmClose");
const cancelOrderBtn = document.querySelector("#cancelOrderBtn");
const confirmOrderBtn = document.querySelector("#confirmOrderBtn");
const addCustomerBtn = document.querySelector("#addCustomerBtn");
//add new cus popup elements
const orderAddCustomerModal = document.querySelector("#orderAddCustomerModal");
const closeOrderAddCustomerBtn = document.querySelector("#closeOrderAddCustomerBtn");
const cancelOrderAddCustomerBtn = document.querySelector("#cancelOrderAddCustomerBtn");
const orderNewCustomerForm = document.querySelector("#orderNewCustomerForm");
const orderNewCustomerName = document.querySelector("#orderNewCustomerName");
const orderNewCustomerPhone = document.querySelector("#orderNewCustomerPhone");
const orderNewCustomerPhoneError = document.querySelector("#orderNewCustomerPhoneError");
const saveOrderNewCustomerBtn = document.querySelector("#saveOrderNewCustomerBtn");
const guestCustomerBtn = document.querySelector("#guestCustomerBtn");
const selectedCustomerInfo = document.querySelector("#selectedCustomerInfo");
const selectedCustomerName = document.querySelector("#selectedCustomerName");
const selectedCustomerRank = document.querySelector("#selectedCustomerRank");

let availableDishes = [];
let isCreatingOrder = false;
let selectedDishes = [];
let selectedCustomerId = null;
let customerSearchRequestId = 0;
let isGuestCustomer = false;
let rockCustomerTypeId = null;


const productImages = {
    1: "../img/espresso.jpg",
    2: "../img/americano.jpg",
    3: "../img/cappuccino.jpg",
    4: "../img/latte.jpg",
    5: "../img/green_tea.jpg",
    6: "../img/peach_tea.jpg",
    7: "../img/lemon_tea.jpg",
    8: "../img/classic_milk_tea.jpg",
    9: "../img/brown_sugar_milk_tea.jpg",
    10: "../img/matcha_milk_tea.jpg",
    11: "../img/croissant.jpg",
    12: "../img/chocolate_muffin.jpg",
    13: "../img/butter_cookie.jpg",
    14: "../img/chicken_sandwich.jpg",
    15: "../img/beef_sandwich.jpg",
    16: "../img/cheesecake.jpg",
    17: "../img/tiramisu.jpg",
    18: "../img/ice_cream.jpg",
};

// HELPER FUNCTS AND THINGS
// Auto hide sidebar on tablet and mobile - New Order only
(() => {
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menuBtn");
    const main = document.querySelector(".main-content");
    if (!sidebar || !menuBtn || !main || !window.matchMedia) return;
    const breakpoint = window.matchMedia("(max-width: 64rem)");
    const syncSidebar = () => {
        const isMobile = breakpoint.matches;

        sidebar.classList.toggle("hidden", isMobile);
        main.classList.toggle("expand", isMobile);
        menuBtn.classList.toggle("update", isMobile);
    };
    syncSidebar();
    if (breakpoint.addEventListener) {
        breakpoint.addEventListener("change", syncSidebar);
    } else {
        breakpoint.addListener(syncSidebar);
    }
})();

function formatCurrency(amount) {
    return amount.toLocaleString("vi-VN") + "VND";
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

// DISH AND BILL AND THINGS
async function loadDishes() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const products = await response.json();

        availableDishes = products
            .filter(product => product.is_available)
            .map(product => ({
                id: Number(product.product_id),
                name: product.name,
                price: Number(product.unit_price),
                image: productImages[Number(product.product_id)]
                    || "../img/tiramisu.jpg"
            }));

        renderDishes(availableDishes);
    } catch (error) {
        console.error("Load products failed:", error);
        dishGrid.innerHTML = `
            <div class="loading-state">
                <span class="loading-spinner"></span>
                <span>Loading menu...</span>
            </div>
        `;
    }
}

function formatCurrency(amount) {
    return amount.toLocaleString("vi-VN") + "VND";
}

function renderDishes(data) {
    dishGrid.innerHTML = "";
    if (data.length === 0) {
        dishGrid.innerHTML = `
            <div class="no-dishes">
                No dishes found.
            </div>
        `;
        return;
    }
    data.forEach(dish => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "dish-card";
        card.innerHTML = `
            <div class="dish-image">
                <img src="${dish.image}" alt="${dish.name}">
            </div>
            <div class="dish-info">
                <div class="dish-name">${dish.name}</div>
                <div class="dish-price">${formatCurrency(dish.price)}</div>
            </div>
        `;
        card.addEventListener("click", () => {
            addDishToBill(dish.id);
        });
        dishGrid.appendChild(card);
    });
}

function addDishToBill(dishId) {
    const existingDish = selectedDishes.find(item => item.id === dishId);
    if (existingDish) {
        existingDish.quantity += 1;
    } else {
        const dish = availableDishes.find(item => item.id === dishId);
        if (!dish) {
            return;
        }
        selectedDishes.push({
            id: dish.id,
            name: dish.name,
            price: dish.price,
            quantity: 1
        });
    }
    renderBill();
}

function increaseQuantity(dishId) {
    const dish = selectedDishes.find(item => item.id === dishId);
    if (!dish) {
        return;
    }
    dish.quantity += 1;
    renderBill();
}

function decreaseQuantity(dishId) {
    const dish = selectedDishes.find(item => item.id === dishId);
    if (!dish) {
        return;
    }
    dish.quantity -= 1;
    if (dish.quantity <= 0) {
        selectedDishes = selectedDishes.filter(item => item.id !== dishId);
    }
    renderBill();
}

function calculateTotal() {
    return selectedDishes.reduce((total, dish) => {
        return total + (dish.price * dish.quantity);
    }, 0);
}

function renderBill() {
    billItems.innerHTML = "";
    if (selectedDishes.length === 0) {
        billItems.innerHTML = `
            <div class="empty-bill">
                No dishes selected.
            </div>
        `;
        billTotal.textContent = "0VND";
        return;
    }
    selectedDishes.forEach(dish => {
        const row = document.createElement("div");
        row.className = "bill-item";
        row.innerHTML = `
            <div class="bill-item-info">
                <div class="bill-item-name">${dish.name}</div>
                <div class="bill-item-price">${formatCurrency(dish.price)}</div>
            </div>
            <div class="quantity-control">
                <button type="button" class="quantity-btn decrease-btn">−</button>
                <span class="quantity-value">${dish.quantity}</span>
                <button type="button" class="quantity-btn increase-btn">+</button>
            </div>
        `;
        row.querySelector(".decrease-btn").addEventListener("click", () => {
            decreaseQuantity(dish.id);
        });
        row.querySelector(".increase-btn").addEventListener("click", () => {
            increaseQuantity(dish.id);
        });
        billItems.appendChild(row);
    });
    billTotal.textContent = formatCurrency(calculateTotal());
}

function searchDishes() {
    const searchTerm = dishSearch.value.toLowerCase().trim();

    const filteredDishes = availableDishes.filter(dish =>
        dish.name.toLowerCase().includes(searchTerm)
    );

    renderDishes(filteredDishes);
}
dishSearch.addEventListener("input", searchDishes);


// ADD NEW CUS POPUP
function closeOrderAddCustomerModal() {
    orderAddCustomerModal.classList.remove("active");
}

async function loadRockCustomerTypeId() {
    try {
        const response = await fetch(`${API_BASE_URL}/customers/customer-types`);
        if (!response.ok) {
            throw new Error("Failed to load customer types.");
        }

        const customerTypes = await response.json();
        const rockType = customerTypes.find(
            type => type.type_name?.trim().toLowerCase() === "rock"
        );
        if (!rockType) {
            throw new Error("Rock membership type was not found.");
        }
        rockCustomerTypeId = rockType.customer_type_id;
        console.log("Rock customer type ID:", rockCustomerTypeId);
    } catch (error) {
        console.error("Error loading customer types:", error);
        showToast("Unable to load membership types. Please try again.", true);
    }
}

function validateNewCustomer() {
    const name = orderNewCustomerName.value.trim();
    const phone = orderNewCustomerPhone.value.trim();
    //validate empty name
    if (!name) {
        showToast("Please enter customer name.", true);
        orderNewCustomerName.focus();
        return false;
    }
    //validate empty phone
    if (!phone) {
        orderNewCustomerPhoneError.textContent =
            "Please enter customer phone number.";
        orderNewCustomerPhone.focus();
        return false;
    }
    //validate  start w 0
    if (!phone.startsWith("0")) {
        orderNewCustomerPhoneError.textContent =
            "Phone number must start with 0.";
        orderNewCustomerPhone.focus();
        return false;
    }
    //validate  length
    if (phone.length !== 10) {
        orderNewCustomerPhoneError.textContent =
            "Phone number must contain exactly 10 digits.";
        orderNewCustomerPhone.focus();
        return false;
    }
    //validate num only digit
    if (!/^[0-9]{10}$/.test(phone)) {
        orderNewCustomerPhoneError.textContent =
            "Phone number must contain digits only.";
        orderNewCustomerPhone.focus();
        return false;
    }
    orderNewCustomerPhoneError.textContent = "";
    return true;
}
orderNewCustomerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateNewCustomer()) {
        return;
    }
    if (!rockCustomerTypeId) {
        showToast("Rock membership type is not available. Please refresh the page.", true);
        return;
    }
    const customerData = {
        name: orderNewCustomerName.value.trim(),
        phone: orderNewCustomerPhone.value.trim(),
        customer_type_id: rockCustomerTypeId
    };
    try {
        saveOrderNewCustomerBtn.disabled = true;
        saveOrderNewCustomerBtn.textContent = "Saving...";
        const response = await fetch(`${API_BASE_URL}/customers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(customerData)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(
                result.detail || "Failed to create customer."
            );
        }
        console.log("Customer created successfully:", result);
        const newCustomer = {
            customer_id: result.customer_id,
            name: result.name,
            phone: result.phone,
            customer_type_name: result.type_name
        };
        //select that freshly created customer
        selectedCustomerId = newCustomer.customer_id;
        isGuestCustomer = false;
        customerPhoneInput.value = newCustomer.phone;
        showSelectedCustomerInfo(newCustomer);
        customerSuggestions.classList.remove("show");
        customerSuggestions.innerHTML = "";
        //close only Add New Customer popup
        closeOrderAddCustomerModal();
        //reset Add New Customer form
        orderNewCustomerForm.reset();
        orderNewCustomerPhoneError.textContent = "";
        //success msg
        showToast("Customer created and selected successfully!");
    } catch (error) {
        console.error("Error creating customer:", error);
        showToast(error.message, true);
    } finally {
        saveOrderNewCustomerBtn.disabled = false;
        saveOrderNewCustomerBtn.textContent = "Save Information";
    }
});

function openOrderAddCustomerModal() {
    orderAddCustomerModal.classList.add("active");
}

// event listeners
addCustomerBtn.addEventListener("click", openOrderAddCustomerModal);
orderNewCustomerPhone.addEventListener("input", () => {
    orderNewCustomerPhoneError.textContent = "";
});
closeOrderAddCustomerBtn.addEventListener("click", closeOrderAddCustomerModal);
cancelOrderAddCustomerBtn.addEventListener("click", closeOrderAddCustomerModal);


//CUSTOMER SEARCH AND SELECTION
async function searchCustomers(phone) {
    const requestId = ++customerSearchRequestId;
    if (!phone.trim()) {
        customerSuggestions.classList.remove("show");
        customerSuggestions.innerHTML = "";
        return;
    }
    try {
        const response = await fetch(
            `${API_BASE_URL}/customers/search?phone=${encodeURIComponent(phone)}`
        );
        if (!response.ok) {
            throw new Error(`Customer search failed: HTTP ${response.status}`);
        }
        const customers = await response.json();
        if (requestId !== customerSearchRequestId) {
            return;
        }
        renderCustomerSuggestions(customers);
    } catch (error) {
        if (requestId !== customerSearchRequestId) {
            return;
        }
        console.error("Customer search failed:", error);
        customerSuggestions.innerHTML = "";
        const message = document.createElement("div");
        message.className = "customer-suggestion-empty";
        message.textContent = "Unable to search for customers";
        customerSuggestions.appendChild(message);
        customerSuggestions.classList.add("show");
    }
}

function renderCustomerSuggestions(customers) {
    customerSuggestions.innerHTML = "";

    if (!customers.length) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "customer-suggestion-empty";
        emptyMessage.textContent = "No customer found";
        customerSuggestions.appendChild(emptyMessage);
        customerSuggestions.classList.add("show");
        return;
    }

    customers.forEach(customer => {
        const item = document.createElement("div");
        item.className = "customer-suggestion-item";
        const phone = document.createElement("span");
        phone.className = "customer-suggestion-phone";
        phone.textContent = customer.phone;
        const info = document.createElement("div");
        info.className = "customer-suggestion-info";
        const name = document.createElement("span");
        name.className = "customer-suggestion-name";
        name.textContent = customer.name;
        const rank = document.createElement("span");
        const rankName = (customer.customer_type_name || "").toLowerCase();
        rank.className = `customer-suggestion-rank ${rankName}`;
        rank.textContent = customer.customer_type_name || "";
        info.append(name, rank);
        item.append(phone, info);
        item.addEventListener("mousedown", event => {
            event.preventDefault();
            selectedCustomerId = customer.customer_id;
            isGuestCustomer = false;
            customerPhoneInput.value = customer.phone;

            showSelectedCustomerInfo(customer);

            customerSuggestions.classList.remove("show");
            customerSuggestions.innerHTML = "";
        });
        customerSuggestions.appendChild(item);
    });

    customerSuggestions.classList.add("show");
}

function showSelectedCustomerInfo(customer) {
    selectedCustomerName.textContent = customer.name || "";
    const rankName = (customer.customer_type_name || "").toLowerCase();
    selectedCustomerRank.className =
        `customer-suggestion-rank ${rankName}`;
    selectedCustomerRank.textContent =
        customer.customer_type_name || "";
    selectedCustomerInfo.classList.add("show");
}

function hideSelectedCustomerInfo() {
    selectedCustomerInfo.classList.remove("show");
    selectedCustomerName.textContent = "";
    selectedCustomerRank.textContent = "";
}

//event listeners
customerPhoneInput.addEventListener("input", () => {
    customerPhoneInput.style.borderColor = "#96C0CE";
    selectedCustomerId = null;
    isGuestCustomer = false;
    hideSelectedCustomerInfo();
    customerPhoneInput.style.borderColor = "";
    searchCustomers(customerPhoneInput.value);
});
customerPhoneInput.addEventListener("focus", () => {
    if (isGuestCustomer) {
        customerPhoneInput.value = "";
        isGuestCustomer = false;
        selectedCustomerId = null;
        hideSelectedCustomerInfo();
    }
    if (customerPhoneInput.value.trim()) {
        searchCustomers(customerPhoneInput.value);
    }
});
document.addEventListener("click", event => {
    if (
        !event.target.closest(".customer-search-wrapper")
    ) {
        customerSuggestions.classList.remove("show");
    }
});


// ORDER CONFIRMATION
function renderConfirmItems() {
    confirmItems.innerHTML = "";
    selectedDishes.forEach(dish => {
        const item = document.createElement("div");
        item.className = "confirm-item";
        item.innerHTML = `
            <div class="confirm-item-name">${dish.name}</div>
            <div class="confirm-item-quantity">× ${dish.quantity}</div>
            <div class="confirm-item-amount">${formatCurrency(dish.price * dish.quantity)}</div>
        `;
        confirmItems.appendChild(item);
    });
    confirmTotal.textContent = formatCurrency(calculateTotal());
}

function openConfirmDialog() {
    if (selectedDishes.length === 0) {
        return;
    }
    customerPhoneInput.value = "";
    orderNoteInput.value = "";
    customerPhoneInput.style.borderColor = "#96C0CE";
    orderNoteInput.style.borderColor = "#96C0CE";
    renderConfirmItems();
    orderConfirmOverlay.classList.add("show");
    customerPhoneInput.focus();
}
function closeConfirmDialog() {
    orderConfirmOverlay.classList.remove("show");
}

async function saveNewOrder(isGuest = false) {
    if (isCreatingOrder || selectedDishes.length === 0) {
        return;
    }

    let customerId = null;

    if (!isGuestCustomer) {
        if (!customerPhoneInput.value.trim()) {
            customerPhoneInput.focus();
            customerPhoneInput.style.borderColor = "#7F0303";
            return;
        }

        if (!selectedCustomerId) {
            showToast("Please select a customer from the suggestion list.", true);
            customerPhoneInput.focus();
            return;
        }

        customerId = selectedCustomerId;
    }

    const payload = {
        username: orderAuthenticatedUser.username,
        customer_id: customerId,
        note: orderNoteInput.value.trim() || null,
        items: selectedDishes.map(dish => ({
            product_id: Number(dish.id),
            quantity: dish.quantity
        }))
    };

    isCreatingOrder = true;
    confirmOrderBtn.disabled = true;
    guestCustomerBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
            console.error("Create order failed:", result);

            showToast(
                result?.detail
                    ? JSON.stringify(result.detail)
                    : "Unable to create order. Please try again.",
                true
            );
            return;
        }

        selectedDishes = [];
        renderBill();
        closeConfirmDialog();

        //go straight to check order to see the new order
        window.location.href =
            `order_check.html?order_id=${encodeURIComponent(result.order_id)}`;

    } catch (error) {
        console.error("Create order request failed:", error);
        showToast("Cannot connect to the server. Please try again.", true);
    } finally {
        isCreatingOrder = false;
        confirmOrderBtn.disabled = false;
        guestCustomerBtn.disabled = false;
    }
}

//event listeners
confirmOrderBtn.addEventListener("click", () => {
    saveNewOrder(false);
});
guestCustomerBtn.addEventListener("click", () => {
    isGuestCustomer = true;
    selectedCustomerId = null;
    customerPhoneInput.value = "Guest"; //change this if u want the dummy value to look different
    hideSelectedCustomerInfo();
    customerSuggestions.classList.remove("show");
    customerSuggestions.innerHTML = "";
    customerPhoneInput.style.borderColor = "";
});
sumBtn.addEventListener("click", openConfirmDialog);
confirmClose.addEventListener("click", closeConfirmDialog);
cancelOrderBtn.addEventListener("click", closeConfirmDialog);



loadRockCustomerTypeId();
loadDishes();
renderBill();