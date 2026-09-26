let selectedDishes = [];
const dishGrid = document.querySelector("#dishGrid");
const billItems = document.querySelector("#billItems");
const billTotal = document.querySelector("#billTotal");
const dishSearch = document.querySelector("#dishSearch");
const sumBtn = document.querySelector("#sumBtn");
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
        const dish = dishesData.find(item => item.id === dishId);
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
    const filteredDishes = dishesData.filter(dish => {
        return dish.name.toLowerCase().includes(searchTerm);
    });
    renderDishes(filteredDishes);
}
dishSearch.addEventListener("input", searchDishes);
const orderConfirmOverlay = document.querySelector("#orderConfirmOverlay");
const customerNameInput = document.querySelector("#customerNameInput");
const confirmItems = document.querySelector("#confirmItems");
const confirmTotal = document.querySelector("#confirmTotal");
const confirmClose = document.querySelector("#confirmClose");
const cancelOrderBtn = document.querySelector("#cancelOrderBtn");
const payNowBtn = document.querySelector("#payNowBtn");
const payLaterBtn = document.querySelector("#payLaterBtn");

function getNextOrderId() {
    const savedOrders = JSON.parse(localStorage.getItem("yumsOrders") || "[]");
    const allIds = [...ordersData, ...savedOrders].map(order => {
        const number = parseInt(order.id.replace("ORD-", ""), 10);
        return isNaN(number) ? 0 : number;
    });
    const nextNumber = Math.max(...allIds, 0) + 1;
    return `ORD-${String(nextNumber).padStart(3, "0")}`;
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
    customerNameInput.value = "";
    renderConfirmItems();
    orderConfirmOverlay.classList.add("show");
    customerNameInput.focus();
}
function closeConfirmDialog() {
    orderConfirmOverlay.classList.remove("show");

}
function saveNewOrder(status) {
    const customerName = customerNameInput.value.trim();
    if (customerName === "") {
        customerNameInput.focus();
        customerNameInput.style.borderColor = "#7F0303";
        return;
    }
    const newOrder = {
        id: getNextOrderId(),
        customer: customerName,
        status: status,
        items: selectedDishes.map(dish => ({
            id: dish.id,
            name: dish.name,
            price: dish.price,
            quantity: dish.quantity
        }))
    };
    const savedOrders = JSON.parse(localStorage.getItem("yumsOrders") || "[]");
    savedOrders.push(newOrder);
    localStorage.setItem("yumsOrders", JSON.stringify(savedOrders));
    orderConfirmOverlay.classList.remove("show");
    selectedDishes = [];
    renderBill();
    window.location.href = "order_check.html";
}

sumBtn.addEventListener("click", openConfirmDialog);
confirmClose.addEventListener("click", closeConfirmDialog);
cancelOrderBtn.addEventListener("click", closeConfirmDialog);
payNowBtn.addEventListener("click", () => {
    saveNewOrder("Success");
});
payLaterBtn.addEventListener("click", () => {
    saveNewOrder("Pending");
});
orderConfirmOverlay.addEventListener("click", event => {
    if (event.target === orderConfirmOverlay) {
        closeConfirmDialog();
    }
});
customerNameInput.addEventListener("input", () => {
    customerNameInput.style.borderColor = "#96C0CE";
});
renderDishes(dishesData);
renderBill();