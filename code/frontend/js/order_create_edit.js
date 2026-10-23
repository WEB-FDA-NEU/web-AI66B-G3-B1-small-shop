const API_BASE_URL = "http://127.0.0.1:8000/api";

let availableDishes = [];
let selectedCustomerId = null;
let isCreatingOrder = false;
let selectedDishes = [];
const dishGrid = document.querySelector("#dishGrid");
const billItems = document.querySelector("#billItems");
const billTotal = document.querySelector("#billTotal");
const dishSearch = document.querySelector("#dishSearch");
const sumBtn = document.querySelector("#sumBtn");

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
            <div class="no-dishes">
                Unable to load products. Please try again.
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
const orderConfirmOverlay = document.querySelector("#orderConfirmOverlay");
const customerPhoneInput = document.querySelector("#customerPhoneInput");
const confirmItems = document.querySelector("#confirmItems");
const confirmTotal = document.querySelector("#confirmTotal");
const confirmClose = document.querySelector("#confirmClose");
const cancelOrderBtn = document.querySelector("#cancelOrderBtn");
const confirmOrderBtn = document.querySelector("#confirmOrderBtn");
const addCustomerBtn = document.querySelector("#addCustomerBtn");
const guestCustomerBtn = document.querySelector("#guestCustomerBtn");

function getNextOrderId() {
    const savedOrders = JSON.parse(localStorage.getItem("yumsOrders") || "[]");
    const allIds = [...ordersData, ...savedOrders].map(order => {
        const number = parseInt(order.id.replace("ORD-", ""), 10);
        return isNaN(number) ? 0 : number;
    });
    const nextNumber = Math.max(...allIds, 0) + 1;
    return `ORD-${String(nextNumber).padStart(3, "0")}`;
}

async function findCustomerByPhone(phone) {
    const response = await fetch(
        `${API_BASE_URL}/customers/search?phone=${encodeURIComponent(phone)}`
    );

    if (!response.ok) {
        throw new Error(`Customer search failed: HTTP ${response.status}`);
    }

    const customers = await response.json();

    return customers.find(customer => customer.phone === phone) || null;
}

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
    customerPhoneInput.style.borderColor = "#96C0CE";

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

    if (!isGuest) {
        const phone = customerPhoneInput.value.trim();

        if (!phone) {
            customerPhoneInput.focus();
            customerPhoneInput.style.borderColor = "#7F0303";
            return;
        }

        try {
            const customer = await findCustomerByPhone(phone);

            if (!customer) {
                alert(
                    "Customer not found. Please check the phone number."
                );
                return;
            }

            customerId = customer.customer_id;
        } catch (error) {
            console.error("Customer lookup failed:", error);
            alert("Unable to search for the customer. Please try again.");
            return;
        }
    }

    const payload = {
        employee_id: 1, //i'll change into "now logged in employee" instead of emp. no1 like this later
        customer_id: customerId,
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

            alert(
                result?.detail
                    ? JSON.stringify(result.detail)
                    : "Unable to create order. Please try again."
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
        alert("Cannot connect to the server. Please try again.");
    } finally {
        isCreatingOrder = false;
        confirmOrderBtn.disabled = false;
        guestCustomerBtn.disabled = false;
    }
}

sumBtn.addEventListener("click", openConfirmDialog);

confirmClose.addEventListener("click", closeConfirmDialog);
cancelOrderBtn.addEventListener("click", closeConfirmDialog);

confirmOrderBtn.addEventListener("click", () => {
    saveNewOrder(false);
});

//addCustomerBtn.addEventListener("click", () => {
//    const customerPhone = customerPhoneInput.value.trim();
//
//    if (customerPhone === "") {
//        customerPhoneInput.focus();
//        customerPhoneInput.style.borderColor = "#7F0303";
//        return;
//    }
//
//    saveNewOrder("Success");
//});

guestCustomerBtn.addEventListener("click", () => {
    saveNewOrder(true);
});

orderConfirmOverlay.addEventListener("click", event => {
    if (event.target === orderConfirmOverlay) {
        closeConfirmDialog();
    }
});

customerPhoneInput.addEventListener("input", () => {
    customerPhoneInput.style.borderColor = "#96C0CE";
});

loadDishes();
renderBill();