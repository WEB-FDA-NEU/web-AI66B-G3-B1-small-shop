const menu_btn = document.querySelector(".menu-btn");
const main = document.querySelector(".main-content");
const sidebar = document.querySelector(".sidebar");

if (menu_btn && main && sidebar) {
    const mobileViewport = window.matchMedia("(max-width: 900px)");
    const syncSidebarWithViewport = isMobile => {
        sidebar.classList.toggle("hidden", isMobile);
        main.classList.toggle("expand", isMobile);
        menu_btn.classList.toggle("update", isMobile);
    };

    syncSidebarWithViewport(mobileViewport.matches);
    mobileViewport.addEventListener("change", event => {
        syncSidebarWithViewport(event.matches);
    });

    menu_btn.addEventListener("click", function() {
        main.classList.toggle("expand");
        sidebar.classList.toggle("hidden");
        menu_btn.classList.toggle("update");
    });
}

let authenticatedUser = {};
const userJson = sessionStorage.getItem("authenticatedUser");

if (userJson) {
    try {
        authenticatedUser = JSON.parse(userJson) || {};
    } catch (error) {
        console.error("Unable to read the authenticated user's profile.", error);
    }
}

const roleNames = {
    Admin: "Administrator",
    Manager: "Manager",
    Cashier: "Cashier",
    Staff: "Staff",
};
const username = authenticatedUser.username || "";
const role = roleNames[authenticatedUser.role] || authenticatedUser.role || "";
if (["Admin", "Manager"].includes(authenticatedUser.role)) {
    const sidebarMenu = document.querySelector(".sidebar-menu");
    if (sidebarMenu && !sidebarMenu.querySelector('a[href="users.html"]')) {
        const usersItem = document.createElement("li");
        usersItem.innerHTML = '<a href="users.html"><i class="fa-solid fa-user-gear"></i> Users</a>';
        sidebarMenu.append(usersItem);
    }
}
if (authenticatedUser.role === "Employee") {
    document.querySelectorAll(
        '.sidebar-menu a[href="employees.html"], .sidebar-menu a[href="sales.html"]'
    ).forEach(link => link.closest("li")?.remove());
}
const initials = username
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");
const welcomeUsername = document.querySelector("#welcome-username");

if (welcomeUsername) {
    welcomeUsername.textContent = username;
}


let profile = document.querySelector(".user-profile, .account-card");

if (profile) {
    const avatar = profile.querySelector(".user-avatar, .avatar");
    const name = profile.querySelector(".user-name, .role-name");
    const userRole = profile.querySelector(".user-role, .role-sub");

    if (avatar) avatar.textContent = initials;
    if (name) name.textContent = username;
    if (userRole) userRole.textContent = role;

    const container = document.createElement("div");
    container.className = "profile-menu-container";
    profile.before(container);
    container.append(profile);

    profile.setAttribute("role", "button");
    profile.setAttribute("tabindex", "0");
    profile.setAttribute("aria-haspopup", "true");
    profile.setAttribute("aria-expanded", "false");
    profile.setAttribute("aria-controls", "profile-dropdown");

    const dropdown = document.createElement("div");
    dropdown.className = "profile-dropdown";
    dropdown.id = "profile-dropdown";
    dropdown.hidden = true;
    dropdown.innerHTML = `
        <section class="profile-dropdown-account" aria-label="Account Information">
            <div class="profile-dropdown-user">
                <div class="profile-dropdown-avatar" aria-hidden="true"></div>
                <div class="profile-dropdown-user-info">
                    <strong class="profile-dropdown-name"></strong>
                    <span class="profile-dropdown-role"></span>
                </div>
            </div>
        </section>
        <div class="profile-dropdown-links">
            <button type="button" class="profile-dropdown-item">
                <i class="fa-regular fa-user" aria-hidden="true"></i>
                My Profile
            </button>
            <button type="button" class="profile-dropdown-item">
                <i class="fa-solid fa-gear" aria-hidden="true"></i>
                Settings
            </button>
            <button type="button" class="profile-dropdown-item">
                <i class="fa-regular fa-circle-question" aria-hidden="true"></i>
                Help
            </button>
        </div>
        <div class="profile-dropdown-logout">
            <button type="button" class="profile-dropdown-item">
                <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
                Log out
            </button>
        </div>
    `;
    container.append(dropdown);
    dropdown.querySelector(".profile-dropdown-avatar").textContent = initials;
    dropdown.querySelector(".profile-dropdown-name").textContent = username;
    dropdown.querySelector(".profile-dropdown-role").textContent = role;

    let openAnimationFrame = 0;
    const setDropdownOpen = isOpen => {
        profile.setAttribute("aria-expanded", String(isOpen));
        cancelAnimationFrame(openAnimationFrame);

        if (isOpen) {
            dropdown.hidden = false;
            openAnimationFrame = requestAnimationFrame(() => {
                dropdown.classList.add("is-open");
            });
        } else {
            dropdown.classList.remove("is-open");
            dropdown.hidden = true;
        }
    };

    profile.addEventListener("click", () => {
        setDropdownOpen(dropdown.hidden);
    });
    profile.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setDropdownOpen(dropdown.hidden);
        }
    });
    document.addEventListener("click", event => {
        if (!container.contains(event.target)) {
            setDropdownOpen(false);
        }
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !dropdown.hidden) {
            setDropdownOpen(false);
            profile.focus();
        }
    });
    dropdown.querySelector(".profile-dropdown-logout").addEventListener("click", () => {
        sessionStorage.removeItem("authenticatedUser");
        window.location.href = "index.html";
    });
}

if (authenticatedUser.role === "Employee") {
    loadEmployeeDashboard();
}

let employeeRevenueChartInstance = null;
let employeeOrdersChartInstance = null;

function renderEmployeeCharts(monthlySales) {
    const monthTotals = new Map(
        monthlySales.map(item => [
            String(item.month || "").slice(0, 7),
            {
                revenue: Number(item.revenue) || 0,
                orderCount: Number(item.order_count) || 0,
            },
        ])
    );
    const currentMonth = new Date();
    const firstMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 5, 1);
    const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return {
            key,
            label: date.toLocaleDateString("en-US", { month: "short" }),
            ...(monthTotals.get(key) || { revenue: 0, orderCount: 0 }),
        };
    });

    if (employeeRevenueChartInstance) employeeRevenueChartInstance.destroy();
    employeeRevenueChartInstance = new Chart(
        document.getElementById("employeeRevenueChart"),
        {
            type: "line",
            data: {
                labels: months.map(month => month.label),
                datasets: [{
                    label: "Sales (₫)",
                    data: months.map(month => month.revenue),
                    borderColor: "#800000",
                    backgroundColor: "rgba(128, 0, 0, 0.08)",
                    borderWidth: 2.5,
                    pointBackgroundColor: "#800000",
                    pointRadius: 4,
                    fill: true,
                    tension: 0.35,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: context =>
                                ` ${Number(context.parsed.y).toLocaleString("vi-VN")} ₫`,
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "#e5ddd3" },
                    },
                    x: { grid: { display: false } },
                },
            },
        }
    );

    if (employeeOrdersChartInstance) employeeOrdersChartInstance.destroy();
    employeeOrdersChartInstance = new Chart(
        document.getElementById("employeeOrdersChart"),
        {
            type: "bar",
            data: {
                labels: months.map(month => month.label),
                datasets: [{
                    label: "Orders Served",
                    data: months.map(month => month.orderCount),
                    backgroundColor: "#0F414A",
                    borderRadius: 6,
                    maxBarThickness: 42,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: context => ` ${context.parsed.y} orders served`,
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "#e5ddd3" },
                    },
                    x: { grid: { display: false } },
                },
            },
        }
    );
}

function formatDashboardCurrency(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

async function loadEmployeeDashboard() {
    const dashboard = document.getElementById("employeeDashboard");
    const message = document.getElementById("employeeDashboardMessage");
    const content = document.getElementById("employeeDashboardContent");
    const ordersBody = document.getElementById("employeeRecentOrdersBody");
    if (!dashboard || !message || !content || !ordersBody) return;

    dashboard.hidden = false;

    const formatDate = value => {
        const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
    };
    const formatVND = value => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

    try {
        const response = await fetch("http://127.0.0.1:8000/employees/me/dashboard");
        const result = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(result?.detail || `Could not load your dashboard (${response.status}).`);
        }

        const employee = result.employee || {};
        const stats = result.stats || {};

        document.getElementById("employeeOrdersKpi").textContent =
            Number(stats.total_orders) || 0;
        document.getElementById("employeeSalesKpi").textContent =
            formatVND(stats.total_sales);
        document.getElementById("employeeDaysKpi").textContent =
            Number(employee.days_worked) || 0;
        renderEmployeeCharts(Array.isArray(result.monthly_sales) ? result.monthly_sales : []);

        const orders = Array.isArray(result.recent_orders) ? result.recent_orders : [];
        ordersBody.replaceChildren();
        if (!orders.length) {
            const row = ordersBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6;
            cell.className = "employee-dashboard-empty";
            cell.textContent = "You have not served any orders yet.";
        } else {
            orders.forEach(order => {
                const row = ordersBody.insertRow();
                const values = [
                    `ORD-${String(order.order_id).padStart(3, "0")}`,
                    formatDate(order.created_at),
                    order.customer_name || "Walk-in",
                    order.items || "—",
                    formatVND(order.total_amount),
                ];
                values.forEach(value => {
                    row.insertCell().textContent = value;
                });
                const statusCell = row.insertCell();
                const statusBadge = document.createElement("span");
                const delivered = order.deliver_status === "delivered";
                statusBadge.className = `employee-dashboard-order-status ${delivered ? "delivered" : "pending"}`;
                statusBadge.textContent = delivered ? "Delivered" : "In progress";
                statusCell.append(statusBadge);
            });
        }

        content.hidden = false;
        message.hidden = true;
    } catch (error) {
        message.textContent = error.message || "Unable to load your dashboard.";
        message.setAttribute("role", "alert");
    }
}

if (["Admin", "Manager"].includes(authenticatedUser.role)) {
    const resetRequests = () => fetch("http://127.0.0.1:8000/auth/password-reset-requests")
        .then(async response => {
            if (!response.ok) {
                throw new Error(`Could not load password reset requests (${response.status}).`);
            }
            return response.json();
        });

    resetRequests()
        .then(requests => {
            if (!requests.length) return;
            const notice = document.createElement("aside");
            notice.setAttribute("role", "status");
            notice.style.cssText = [
                "position:fixed",
                "right:20px",
                "top:20px",
                "z-index:2000",
                "max-width:360px",
                "padding:14px 18px",
                "border:1px solid #D2C7B8",
                "border-radius:8px",
                "background:#FAF6F0",
                "color:#2A2421",
                "box-shadow:0 4px 16px rgba(0,0,0,.16)",
            ].join(";");
            const text = document.createElement("span");
            text.textContent = `${requests.length} password reset request${requests.length === 1 ? "" : "s"} need review. `;
            const link = document.createElement("a");
            link.href = "users.html#resetRequestsPanel";
            link.textContent = "Review";
            link.style.color = "#7F0303";
            notice.append(text, link);
            document.body.append(notice);
        })
        .catch(error => console.error("Password reset request notification failed.", error));

    window.setInterval(() => {
        resetRequests()
            .then(requests => {
                const badge = document.querySelector(".reset-request-badge");
                if (!requests.length) {
                    badge?.remove();
                    return;
                }
                const menuLink = document.querySelector('.sidebar-menu a[href="users.html"]');
                if (!menuLink) return;
                const currentBadge = menuLink.querySelector(".reset-request-badge");
                const requestsBadge = currentBadge || document.createElement("span");
                requestsBadge.className = "reset-request-badge";
                requestsBadge.textContent = String(requests.length);
                requestsBadge.setAttribute(
                    "aria-label",
                    `${requests.length} pending password reset requests`
                );
                if (!currentBadge) menuLink.append(requestsBadge);
            })
            .catch(error => console.error("Password reset request badge refresh failed.", error));
    }, 60_000);
}
